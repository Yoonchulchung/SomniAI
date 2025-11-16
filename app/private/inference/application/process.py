import asyncio
from abc import ABC, abstractmethod
from inference.domain.channel import ChannelType
from inference.infrastructure.ai.inference import IInference
from inference.infrastructure.ai.loader import ModelLoaderInterface
from inference.infrastructure.mqtt import SomniAIMQTT
import torch
from PIL import Image


class IProcess(ABC):

    '''
    Process는 SomniAI 서버의 요청 처리를 담당합니다.
    클라이언트가 요청한 데이터를 관리하고 처리할 수 있어야 합니다.
    
    GPU 처리 여부는 외부에서 결정합니다.
    Process를 통해 추론 결과는 MQTT 큐에 저장되게 됩니다.
    '''

    @abstractmethod
    async def enqueue_request(self, dataset: Image.Image) -> None:

        '''
        데이터를 큐에 넣습니다.
        '''
        raise NotImplementedError


    @abstractmethod
    async def micro_scheduler(self) -> None:

        '''
        큐 데이터를 이용하여 AI 추론을 진행합니다.
        '''
        raise NotImplementedError


class AirProcess(IProcess):

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
    
    def __init__(
        self,
        cfg,
        model_loader : ModelLoaderInterface,
        channel_type: ChannelType,
        inference : IInference,
        queue,
        MQTT : SomniAIMQTT,
        logger
    ):
        self.cfg_HTTP = cfg.HTTP

        self.channel_type = channel_type
        self.logger = logger

        self.inference = inference(model_loader, cfg)
        self.mqtt = MQTT
        
        self.BATCH_THRESHOLD = self.cfg_HTTP.BATCH_THRESHOLD
        self.BATCH_TIMEOUT = self.cfg_HTTP.BATCH_TIMEOUT
        
        self.queue = queue
        
        self.result_queue = asyncio.Queue()
        
        self._model_lock = asyncio.Lock()

        if not torch.cuda.is_available():
            raise ValueError(f"Process is only available with GPU")
        self.device = "cuda"
 
    async def enqueue_request(self, dataset: Image.Image) -> None:
        '''데이터를 큐에 넣습니다'''
        
        self.queue.enqueue(dataset)

    async def micro_scheduler(self) -> None:

        '''
        배치 스케줄러를 사용하여 AI 추론을 진행합니다.
        큐에 데이터가 있으면 바로 가져오고 없으면 있을 때까지 대기합니다.
        설정한 배치 크기에 다달하면 AI 추론을 시작합니다.
        '''

        self.logger(f"[{self.channel_type.value}] Micro scheduler started")

        batch = []
        loop = asyncio.get_running_loop()

        while True:
            deadline = loop.time() + self.BATCH_TIMEOUT

            while len(batch) < self.BATCH_THRESHOLD:

                dataset = self.queue.try_dequeue()
                if dataset:
                    batch.append(dataset)

            while len(batch) < self.BATCH_THRESHOLD:
                timeout = deadline - loop.time()
                if timeout <= 0:
                    break
                
                dataset = self.queue.dequeue()
                if dataset:
                    batch.append(dataset)
                    
            if batch:
                _batch = batch.copy()
                batch = []
                asyncio.create_task(self._run_inference(_batch))
 

    async def _run_inference(self, batch):
        '''배치 추론을 실행합니다'''

        try:
            item = batch.pop(0)

        except IndexError:
            self.logger(f"[{self.channel_type.value}] No items in batch.")
            return

        img = item
        loop = asyncio.get_event_loop()

        async with self._model_lock:
            result = await loop.run_in_executor(None, self.inference.forward, img)

        await self.result_queue.put(result)
        self.logger(f"[{self.channel_type.value}] Inference completed")

        # await self._save_result(result)

    async def _save_result(self, result):
        '''결과를 MQTT로 전송합니다'''

        async with self.mqtt as mqtt_broker:
            await mqtt_broker.send_to_message_broker(result["pose_output"])
            
            
class SideProcess(IProcess):
    
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
    
    def __init__(
        self,
        cfg,
        model_loader : ModelLoaderInterface,
        channel_type: ChannelType,
        inference : IInference,
        queue,
        MQTT : SomniAIMQTT,
        logger
    ):
        self.cfg_HTTP = cfg.HTTP

        self.channel_type = channel_type
        self.logger = logger

        self.inference = inference(model_loader, cfg)
        self.mqtt = MQTT
        
        self.BATCH_THRESHOLD = self.cfg_HTTP.BATCH_THRESHOLD
        self.BATCH_TIMEOUT = self.cfg_HTTP.BATCH_TIMEOUT
        
        self.queue = queue
        
        self.result_queue = asyncio.Queue()
        
        self._model_lock = asyncio.Lock()

        if not torch.cuda.is_available():
            raise ValueError(f"Process is only available with GPU")
        self.device = "cuda"
 
    async def enqueue_request(self, dataset: Image.Image) -> None:
        '''데이터를 큐에 넣습니다'''
        
        self.queue.enqueue(dataset)

    async def micro_scheduler(self) -> None:

        '''
        배치 스케줄러를 사용하여 AI 추론을 진행합니다.
        큐에 데이터가 있으면 바로 가져오고 없으면 있을 때까지 대기합니다.
        설정한 배치 크기에 다달하면 AI 추론을 시작합니다.
        '''

        self.logger(f"[{self.channel_type.value}] Micro scheduler started")

        batch = []
        loop = asyncio.get_running_loop()

        while True:
            deadline = loop.time() + self.BATCH_TIMEOUT

            while len(batch) < self.BATCH_THRESHOLD:

                dataset = self.queue.try_dequeue()
                if dataset:
                    batch.append(dataset)

            while len(batch) < self.BATCH_THRESHOLD:
                timeout = deadline - loop.time()
                if timeout <= 0:
                    break
                
                dataset = self.queue.dequeue()
                if dataset:
                    batch.append(dataset)
                    
            if batch:
                _batch = batch.copy()
                batch = []
                asyncio.create_task(self._run_inference(_batch))
 

    async def _run_inference(self, batch):
        '''배치 추론을 실행합니다'''

        try:
            item = batch.pop(0)

        except IndexError:
            self.logger(f"[{self.channel_type.value}] No items in batch.")
            return

        img = item
        loop = asyncio.get_event_loop()

        async with self._model_lock:
            result = await loop.run_in_executor(None, self.inference.forward, img)

        await self.result_queue.put(result)
        self.logger(f"[{self.channel_type.value}] Inference completed")

        # await self._save_result(result)

    async def _save_result(self, result):
        '''결과를 MQTT로 전송합니다'''

        async with self.mqtt as mqtt_broker:
            await mqtt_broker.send_to_message_broker(result["pose_output"])