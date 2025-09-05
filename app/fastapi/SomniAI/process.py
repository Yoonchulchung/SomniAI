from fastapi import HTTPException
import torch
import asyncio
from typing import Dict,  Any
import time
import gc

class ProcessGPU():
    
    _instance = None
    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self, cfg, Inference, Dataset, logger):
        self.cfg = cfg
        self.dataset = Dataset
        self.logger = logger
        
        self.inference_mode = cfg.INFERENCE_MODE
        self.inference = Inference()
        
        self._models: Dict[str, Any] = {}
        
        self._request_lock = asyncio.Queue()
        self.request_queue = asyncio.Queue()
        
        self._model_lock = asyncio.Lock()
        self.model_queeu = asyncio.Queue()
        
        self._result_lock = asyncio.Lock()
        self.result_queue = asyncio.Queue()
        
        
    async def add_model(self, model):
        async with self._model_lock:
            if model in self._models:
                self.logger(f"[ProcessGPU] {model} already loaded.")
                return self._models[model]

        self._models[model] = model
        self.logger(f"[ProcessGPU] Loaded {model} on {self.device}")
            
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
        
    async def get_result(self):
        async with self._result_lock:
            return self.result_queue.pop()
        
    async def enqueue_batch_or_tensor(self, dataset):
        
        if dataset.ndim == 4:
            for img in dataset:          # shape: [N, C, H, W]
                await self.cfg.request_queue.put(img)
        elif dataset.ndim == 3:
            await self.cfg.request_queue.put(dataset)  # single image
        else:
            raise HTTPException(status_code=400, detail="Invalid tensor shape")

    async def enque_gpu(self, id):
        await self.gpu_available.put(id)
        
    
    async def micro_batch_schdeuler(self, ):
        '''
        Make Batch until GPU is available.
        '''
        batch = []
        
        while True:
            try:
                if len(batch) < self.cfg.BATCH_THRESHOLD :
                    img = await asyncio.wait_for(self.cfg.request_queue.get(), timeout=self.cfg.BATCH_TIMEOUT)
                    batch.append(img)

            except asyncio.TimeoutError:
                pass
            
            if batch and self.cfg.gpu_available.qsize() > 0:
                gpu_id = await self.cfg.gpu_available.get()

                batch_tensor = torch.stack(batch, dim=0)
                batch = []
                batch_tensor = self.dataset.preprocess(batch_tensor)

                asyncio.create_task(self._run_inference(_models, batch_tensor, gpu_id))
            
            
    async def _run_inference(self, model, batch, gpu_id):
        
        start_time = time.time()
        loop = asyncio.get_event_loop()
        async with self._model_lock:
            result = await loop.run_in_executor(None, self.inference, model, batch, gpu_id)
        
        async with self._result_lock:
            await self.result_queue(result)