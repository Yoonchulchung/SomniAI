import asyncio
from typing import Generic, TypeVar

from PIL import Image

T = TypeVar('T')

class RequestQueue(Generic[T]):

    def __init__(self, name: str):

        self.name = name
        self._queue: asyncio.Queue[T] = asyncio.Queue()
        self._lock = asyncio.Lock()


    async def enqueue(self, item: T) -> None:

        async with self._lock:
            await self._queue.put(item)
 
    def try_dequeue(self) -> T | None:

        try:
            return self._queue.get_nowait()
        except asyncio.QueueEmpty:
            return None

    async def dequeue(self, timeout: float = None) -> T:
        
        if timeout is None:
            return await self._queue.get()

        return await asyncio.wait_for(self._queue.get(), timeout=timeout)

    def qsize(self) -> int:
        return self._queue.qsize()

    def __repr__(self) -> str:
        return f"RequestQueue(name={self.name}, size={self.qsize()})"

 
class ImageRequestQueue(RequestQueue[Image.Image]):

    async def enqueue(self, item: Image.Image) -> None:
        if not isinstance(item, Image.Image):
            raise TypeError(f"Expected PIL.Image.Image, got {type(item)}")

        await super().enqueue(item)