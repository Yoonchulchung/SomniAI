import json
import base64
from concurrent.futures import ThreadPoolExecutor

from typing import Protocol, Dict, Any, Optional, Tuple
class Transport(Protocol):
    def post(self, data): ...

class RequestHTTP_1_1(Transport):
    
    def __init__(self, cfg):
        
        self.cfg = cfg
        self._session = self.cfg.build_session()
        
        self.url = self._get_url(self.cfg.server_url)
        
    def _get_url(self, url):
        if url is None:
            raise ValueError("URL is None")
    
        if not url.lower().startswith("http://"):
            return "".join(["http://", url])
        else:
            return url
            
    def _post_bytes(self, data : bytes):
        headers = {"Content-Type": "application/octet-stream"}
        return self._session.post(url=self.url, data=data, headers=headers)  
    
    def _post_bytes_multi_user(self, data : bytes):
        headers = {"Content-Type": "multipart/form-data"}
        def send_once():
            return self.cfg.requests_mod.post(url=self.url, data=data, headers=headers)
        
        with ThreadPoolExecutor(max_workers=self.cfg.concurrency) as exe:
            futures = [exe.submit(send_once) for _ in range(self.cfg.total_requests)]
        return futures
    
    def _post_json(self, data : bytes):

        b64_data = base64.b64encode(data).decode("utf-8")
                
        obj = {'image' : b64_data}
        return self._session.post(self.get_url(self.url), json=obj)
        

    def post(self, data):
        
        print("Sending data....")
        
        handlers = {
            'application/json' : self._post_json,
            'application/octet-stream' : self._post_bytes,
        }
        
        handler = handlers.get(self.cfg.content_type)
        r = handler(data)
        
        print('=' * 10, "Received Data", "="*10)
        for key, value in r.headers.items():
            print(f"{key}: {value}")
        print(json.dumps(r.json(), indent=2))
        print("="* 35)