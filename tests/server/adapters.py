from .ports import Transport
import json
import base64
from concurrent.futures import ThreadPoolExecutor


class RequestHTTP_1_1(Transport):
    
    def __init__(self, cfg):
        
        self.cfg = cfg()
        self._session = self.cfg.build_session()
        
    def get_url(self, url):
        if url is None:
            raise ValueError("URL is None")
    
        if not url.lower().startswith("http://"):
            return "".join(["http://", url])
        else:
            return url
            
    def post_bytes(self, url, data, headers):
        
        r = self._session.post(self.get_url(url), data=data, headers=headers)   
        return r.status_code, r.content
    
    def post_bytes_multi_user(self, url, data, headers, total_requests=1000, concurrency=50):
    
        def send_once():
            return self.cfg.requests_mod.post(url=url, data=data, headers=headers)
        
        with ThreadPoolExecutor(max_workers=concurrency) as exe:
            futures = [exe.submit(send_once) for _ in range(total_requests)]
        
    def post_json(self, url, data, headers = None):
        hdrs = {"Content-Type":"application/json", **(headers or {})}

        data = base64.encodebytes(data) if not is_base64(data) else data
        
        obj = {'image' : data}
        r = self._session.post(self.get_url(url), data=json.dumps(obj), headers=hdrs)
        return r.status_code, r.content

def is_base64(s: str) -> bool:
    if not s or not isinstance(s, str):
        return False
    try:
        base64.b64decode(s, validate=True)
        return True
    except Exception:
        return False
    