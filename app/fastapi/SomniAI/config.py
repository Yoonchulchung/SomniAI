from dataclasses import dataclass, field
import asyncio
from typing import List, ClassVar

@dataclass
class ServiceHTTPConfig:
    ...
    
@dataclass
class ServiceGPUConfig:
    '''
    This Config should share Memory
    '''
    request_queue: asyncio.Queue = asyncio.Queue()
    gpu_available: asyncio.Queue = asyncio.Queue()
    
    BATCH_THRESHOLD : int = 256
    BATCH_TIMEOUT : int = 1.0 # 1sec

    models : ClassVar[List[object]] = []