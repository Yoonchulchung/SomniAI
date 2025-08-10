from dataclasses import dataclass

from requests import Session
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import requests

@dataclass
class TestConfig():

    retry_total : int = 2
    backoff_factor : float = 0.2
    raise_on_status : bool = False
    status_forcelist: tuple[int, ...] = (502, 503, 504)
    pool_connections : int = 100
    pool_maxsize : int = 100
    
    requests_mod : type = requests
    
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