import asyncio
import time
from abc import ABC, abstractmethod
from typing import List, Optional, Any

import torch
from PIL import Image

from inference.domain.channel import ChannelType
from inference.infrastructure.ai.inference import IInference
from inference.infrastructure.ai.loader import ModelLoaderInterface
from inference.infrastructure.mqtt import SomniAIMQTT

class IProcess(ABC):
    '''
    Process 인터페이스
    '''
    @abstractmethod
    async def enqueue_request(self, image: Image.Image) -> None:
        raise NotImplementedError

    @abstractmethod
    async def micro_scheduler(self) -> None:
        raise NotImplementedError


class BaseGPUProcess(IProcess):
    '''
    AirProcess와 SideProcess의 공통 로직을 담당하는 부모 클래스입니다.
    '''
    _instances = {}

    def __new__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super(BaseGPUProcess, cls).__new__(cls)
        return cls._instances[cls]

    @classmethod
    def get_instance(cls):
        if cls not in cls._instances:
            raise RuntimeError(f"{cls.__name__} is not initialized yet")
        return cls._instances[cls]

    def __init__(
        self,
        cfg,
        channel_type: ChannelType,
        inference: IInference,
        MQTT: SomniAIMQTT,
        logger,
        **kwargs,
    ):
        if hasattr(self, "initialized") and self.initialized:
            return

        self.cfg_HTTP = cfg.HTTP
        self.channel_type = channel_type
        self.logger = logger
        self.inference = inference
        self.mqtt = MQTT

        self.BATCH_THRESHOLD = self.cfg_HTTP.BATCH_THRESHOLD
        self.BATCH_TIMEOUT = self.cfg_HTTP.BATCH_TIMEOUT

        self.queue = asyncio.Queue()
        self.result_queue = asyncio.Queue()
        
        self._model_lock = asyncio.Lock()

        if not torch.cuda.is_available():
            raise ValueError("Process is only available with GPU")
        self.device = "cuda"
        
        self.initialized = True

    async def enqueue_request(self, image: Image.Image) -> None:

        if not isinstance(image, Image.Image):
            self.logger(f"Invalid type: {type(image)}")
            return
        
        await self.queue.put(image)

    async def get_result(self) -> Any:
        '''결과 큐에서 데이터를 가져옵니다 (Non-blocking).'''
        try:
            return self.result_queue.get_nowait()
        except asyncio.QueueEmpty:
            return None, None

    async def micro_scheduler(self) -> None:
        '''
        효율적인 배치 처리를 위한 스케줄러
        데이터가 하나라도 들어오면 타이머를 시작하여 BATCH_TIMEOUT 동안 
        BATCH_THRESHOLD 만큼 데이터를 모읍니다.
        '''
        loop = asyncio.get_running_loop()
        
        while True:
            batch: List[Image.Image] = []
            
            try:
                first_item = await self.queue.get()
                batch.append(first_item)
            except Exception as e:
                self.logger.error(f"Queue consumption error: {e}")
                continue

            deadline = loop.time() + self.BATCH_TIMEOUT
            
            while len(batch) < self.BATCH_THRESHOLD:
                timeout = deadline - loop.time()
                if timeout <= 0:
                    break
                
                try:
                    item = await asyncio.wait_for(self.queue.get(), timeout=timeout)
                    batch.append(item)
                except asyncio.TimeoutError:
                    break
                except Exception as e:
                    self.logger.error(f"Error collecting batch: {e}")
                    break
            
            if batch:
                asyncio.create_task(self._run_inference(batch))

    async def _run_inference(self, batch: List[Image.Image]):
        '''배치 단위 추론 실행'''
        if not batch:
            return

        loop = asyncio.get_running_loop()
        
        self.logger(f"[{self.channel_type.value}] Start inference with batch size: {len(batch)}")
        batch = batch[0]
        
        try:
            async with self._model_lock:
                results = await loop.run_in_executor(None, self.inference.forward, batch)
            
            await self._handle_results(batch, results)

        except Exception as e:
            self.logger.error(f"[{self.channel_type.value}] Inference failed: {e}")

    async def _handle_results(self, batch, results):
        '''결과 저장 및 MQTT 전송 로직 분리'''
        
        await self.result_queue.put((batch, results))
        
        self.logger(f"[{self.channel_type.value}] Inference completed & Saved")

        # try:
        #     async with self.mqtt as mqtt_broker:
        #         # 결과 포맷에 맞춰 전송
        #         await mqtt_broker.send_to_message_broker(results)
        # except Exception as e:
        #     self.logger.error(f"MQTT Error: {e}")


class AirProcess(BaseGPUProcess):
    pass

class SideProcess(BaseGPUProcess):
    pass