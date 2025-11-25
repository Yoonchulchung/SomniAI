import asyncio
from abc import ABC, abstractmethod
from typing import Any, List

import torch
from PIL import Image

from infrastructure.middleware.mqtt import SomniAIMQTT
from modules.inference.domain.channel import ChannelType
from modules.inference.infrastructure.ai.inference import IInference


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
                task = asyncio.create_task(self.inference._run_inference(batch))
                results, infer_batch = await task
                await _save_to_queue(self.logger, self.result_queue, infer_batch, results)

                if self.channel_type.lower() == ChannelType.SIDE:
                    await _send_to_mqtt(self.mqtt, "/somniai/neck/angle", self.logger, results)


async def _save_to_queue(logger, queue, batch, results):
    await queue.put((batch, results))
    

async def _send_to_mqtt(mqtt, topic, logger, results):

    try:
        async with mqtt as mqtt_broker:
            await mqtt_broker.send_to_message_broker(topic, results["pose_analysis"])

    except Exception as e:
        logger.error(f"MQTT Error: {e}")

    ...


class AirProcess(BaseGPUProcess):
    pass

class SideProcess(BaseGPUProcess):
    pass