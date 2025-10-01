import asyncio
from typing import Dict

from PIL import Image


class Queue:
    
    _instance = None
    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            raise RuntimeError("Queue is not initialized yet")
        return cls._instance
    
    def __init__(self, logger):
        
        self.logger = logger
                        
        self._vision_result_lock = asyncio.Lock()
        self._vision_result_q = asyncio.Queue()
        
        self._vlm_result_lock = asyncio.Lock()
        self._vlm_result_q = asyncio.Queue()
        
        
    async def get_vision_result(self) -> tuple[Image.Image, Dict]:
        
        if self._vision_result_q.empty():
            return (None, None)
        
        async with self._vision_result_lock:
            img, message = await self._vision_result_q.get()
            
        img = img[0]
        if not isinstance(img, Image.Image):
            raise TypeError(f"Expected a PIL.Image.Image, but got {type(img)}")
        
        return (img, message)
    
    async def get_vlm_result(self) -> tuple[Image.Image, Dict]:
        
        if self._vlm_result_q.empty():
            return (None, None)
        
        async with self._vlm_result_lock:
            img, message = await self._vlm_result_q.get()
            
        img = img[0]
        if not isinstance(img, Image.Image):
            raise TypeError(f"Expected a PIL.Image.Image, but got {type(img)}")
        
        return (img, message)
        
    
    async def enqueue_vision(self, img : Image.Image) -> None:
        
        if not isinstance(img, Image.Image):
            raise TypeError("Invalid Image Type")
        
        async with self._vision_result_lock:
            await self._vision_result_q.put(img)
        
            
    async def enqueue_vlm(self, img : Image.Image) -> None:
        
        if not isinstance(img, Image.Image):
            raise TypeError("Invalid Image Type")

        async with self._vlm_result_lock:
            await self._vlm_result_q.put(img)