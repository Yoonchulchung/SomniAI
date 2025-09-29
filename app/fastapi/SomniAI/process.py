import asyncio
import gc
import time
from typing import Any, Dict

import torch
from fastapi import HTTPException
from PIL import Image



class ProcessGPU:
    
    _instance = None
    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            raise RuntimeError("ProcessGPU is not initialized yet")
        return cls._instance
    
    def __init__(self, cfg_AI, cfg_HTTP, Inference, Dataset, logger):
        self.cfg_AI = cfg_AI
        self.cfg_HTTP = cfg_HTTP
        
        self.dataset = Dataset
        self.logger = logger
        
        self.inference = Inference
        
        self.BATCH_THRESHOLD = self.cfg_HTTP.BATCH_THRESHOLD
        self._models: Dict[str, Any] = {}
        
        # For Air View
        self._air_img_req_lock = asyncio.Lock()
        self._air_img_req_q = asyncio.Queue()
        
        self._air_result_lock = asyncio.Lock()
        self._air_result_q = asyncio.Queue()
        
        # For Side View
        self._side_img_req_lock = asyncio.Lock()
        self._side_img_req_q = asyncio.Queue()
        
        self._side_result_lock = asyncio.Lock()
        self._side_result_q = asyncio.Queue()
        
        self._model_lock = asyncio.Lock()
        self.model_queeu = asyncio.Queue()
        
        self._gpu_lock = asyncio.Lock()
        self.gpu_available = asyncio.Queue()
        
        if not torch.cuda.is_available():
            raise ValueError(f"ProcessGPU is only available with gpu")
        
        self.device = "cuda"
        
        self.BATCH_THRESHOLD = 1
        self.BATCH_TIMEOUT = 9 
        self._infer_air_sema =  asyncio.Semaphore(1) 
        self._infer_side_sema =  asyncio.Semaphore(1) 
        
    async def add_model(self, model, gpu_id):
        async with self._model_lock:
            if model in self._models:
                self.logger(f"[ProcessGPU] {model} already loaded.")

            self._models[model] = model
            self.logger(f"")
            props = torch.cuda.get_device_properties(gpu_id)
            total_b = props.total_memory
            free_b = max(0, total_b - torch.cuda.memory_reserved(gpu_id) - torch.cuda.memory_allocated(gpu_id))
            
            self.logger(f"MEM info : Total : {float(total_b/1e9):2.2f}/{float(free_b/1e9):2.2f} GB")
            
            self.inference.set_model(model)
            
    async def delete_model(self, model_name):
        async with self._model_lock:
            model = self._models.pop(model_name, None)
            if model is None:
                self.logger(f"[ProcessGPU] {model_name} was not loaded.")
                return False

            try:
                # 필요한 경우 어댑터에 close/unload 훅이 있으면 호출
                if hasattr(model, "close"):
                    model.close()
                del model
            finally:
                gc.collect()
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()

            self.logger(f"[ProcessGPU] Unloaded {model_name}")
            return True
        
        
    async def get_air_result(self) -> tuple[Image.Image, str]:
        
        if self._air_result_q.empty():
            return (None, None)
        
        async with self._air_result_lock:
            img, message = await self._air_result_q.get()
            
        img = img[0]
        if not isinstance(img, Image.Image):
            raise TypeError(f"Expected a PIL.Image.Image, but got {type(img)}")
        
        return (img, message)
    
    async def get_side_result(self) -> tuple[Image.Image, str]:
        
        if self._side_result_q.empty():
            return (None, None)
        
        async with self._side_result_lock:
            img, message = await self._side_result_q.get()
            
        img = img[0]
        if not isinstance(img, Image.Image):
            raise TypeError(f"Expected a PIL.Image.Image, but got {type(img)}")
        
        return (img, message)
        
    
    async def enqueue_air(self, img : Image.Image) -> None:
        
        if not isinstance(img, Image.Image):
            raise TypeError("Invalid Image Type")
        
        async with self._air_img_req_lock:
            await self._air_img_req_q.put(img)
            
            
    # async def enqueue_air_tesnor(self, dataset):
        
    #     if isinstance(torch, dataset):
    #         if dataset.ndim == 4:
    #             async with self._air_img_req_lock:
    #                 for img in dataset:          # shape: [N, C, H, W]
    #                     await self._air_img_req_q.put(img)
    #         elif dataset.ndim == 3:
    #             async with self._air_img_req_lock:
    #                 await self._air_img_req_lock.put(dataset)  # single image
    #         else:
    #             raise HTTPException(status_code=400, detail="Invalid tensor shape")
    #     elif isinstance(Image.Image, dataset):
    #         ...
            
    async def enqueue_side(self, img : Image.Image) -> None:
        
        if not isinstance(img, Image.Image):
            raise TypeError("Invalid Image Type")

        async with self._side_img_req_lock:
            await self._side_img_req_q.put(img)
            

    # async def enqueue_side_tensor(self, dataset):
        
    #     if isinstance(torch, dataset):
    #         if dataset.ndim == 4:
    #             async with self._side_img_req_lock:
    #                 for img in dataset:          # shape: [N, C, H, W]
    #                     await self._side_img_req_q.put(img)
    #         elif dataset.ndim == 3:
    #             async with self._side_img_req_lock:
    #                 await self._side_img_req_lock.put(dataset)  # single image
    #         else:
    #             raise HTTPException(status_code=400, detail="Invalid tensor shape")
        

    async def enque_gpu(self, id):
        await self.gpu_available.put(id)
        
            
    async def air_micro_scheduler(self):
    
        loop = asyncio.get_running_loop()

        while True:
            first = await self._air_img_req_q.get()
            batch = [first]

            deadline = loop.time() + self.BATCH_TIMEOUT

            while len(batch) < self.BATCH_THRESHOLD:
                try:
                    nxt = self._air_img_req_q.get_nowait()
                    batch.append(nxt)
                except asyncio.QueueEmpty:
                    break

            while len(batch) < self.BATCH_THRESHOLD:
                timeout = deadline - loop.time()
                if timeout <= 0:
                    break
                try:
                    nxt = await asyncio.wait_for(self._air_img_req_q.get(), timeout=timeout)
                    batch.append(nxt)
                except asyncio.TimeoutError:
                    break

            asyncio.create_task(self._process_air_batch(batch))


    async def _process_air_batch(self, batch):
        async with self._infer_air_sema:
            try:
                await self._run_air_inference(batch)
            finally:
                for _ in batch:
                    self._air_img_req_q.task_done()
                
    
    async def side_micro_scheduler(self):
        
        loop = asyncio.get_running_loop()

        while True:
            first = await self._side_img_req_q.get()
            batch = [first]

            deadline = loop.time() + self.BATCH_TIMEOUT

            while len(batch) < self.BATCH_THRESHOLD:
                try:
                    nxt = self._side_img_req_q.get_nowait()
                    batch.append(nxt)
                except asyncio.QueueEmpty:
                    break

            while len(batch) < self.BATCH_THRESHOLD:
                timeout = deadline - loop.time()
                if timeout <= 0:
                    break
                try:
                    nxt = await asyncio.wait_for(self._side_img_req_q.get(), timeout=timeout)
                    batch.append(nxt)
                except asyncio.TimeoutError:
                    break

            asyncio.create_task(self._process_side_batch(batch))


    async def _process_side_batch(self, batch):
        async with self._infer_air_sema:
            try:
                await self._run_side_inference(batch)
            finally:
                for _ in batch:
                    self._side_img_req_q.task_done()
            
            
    async def _run_air_inference(self, batch):
        
        loop = asyncio.get_event_loop()
        
        async with self._model_lock:
            result = await loop.run_in_executor(None, self.inference.run_in_vlm, batch)
        async with self._air_result_lock:
            await self._air_result_q.put((batch, result))
            
    
    async def _run_side_inference(self, batch):
        
        loop = asyncio.get_event_loop()
        
        async with self._model_lock:
            result = await loop.run_in_executor(None, self.inference.run_in_vision, batch)
        async with self._side_result_lock:
            await self._side_result_q.put((batch, result))