from dataclasses import dataclass, field

from requests import Session
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import requests
from enum import Enum

from typing import Set

class PostMode(str, Enum):
    RAND = "rand"
    REAL = "real"
    
class ContentType(str, Enum):
    JSON = "application/json"
    OCTET = "application/octet-stream"
    MULTIPART = "multipart/form-data"

@dataclass
class TestConfig():

    retry_total : int = 2
    backoff_factor : float = 0.2
    raise_on_status : bool = False
    status_forcelist: tuple[int, ...] = (502, 503, 504)
    pool_connections : int = 100
    pool_maxsize : int = 100    

    requests_mod : type = requests
    img_path : str ='../data/samples/image_000043.png'
    img_size : int = 640
    batch : int = 30
    server_url : str = 'http://127.0.0.1:8000/upload/http_1_1'
    post_mode: PostMode = PostMode.RAND

    content_type : ContentType = ContentType.OCTET
    
    _avail_modes : Set[str] = field(default_factory=lambda: {m.value for m in PostMode}, init=False, repr=False)
    _avail_ct : Set[str] = field(default_factory=lambda: {m.value for m in ContentType}, init=False, repr=False)

    def __post_init__(self,):
        self._check_post_mode()
        self._check_ct()
                    
        
    def _check_post_mode(self):
        if not self.post_mode in self._avail_modes:
            raise ValueError(f"Only {self._avail_modes} is available!")
        
    def _check_ct(self):
        if not self.content_type in self._avail_ct:
            raise ValueError(f"Only {self._avail_ct} is available!")
        
    def build_session(self) -> Session:
        s = Session()
        retry = Retry(
            total=self.retry_total,
            backoff_factor=self.backoff_factor,
            raise_on_status=self.raise_on_status,
            status_forcelist=self.status_forcelist,
        )
        adapter = HTTPAdapter(
            pool_connections=self.pool_connections,
            pool_maxsize=self.pool_maxsize,
            max_retries=retry,
        )
        s.mount("http://", adapter)
        s.mount("https://", adapter)
        return s
    