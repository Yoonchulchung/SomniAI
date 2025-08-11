from fastapi import Request, HTTPException
import torch

from typing import Protocol
from io import BytesIO

from .log import SomniAI_log

class Response(Protocol):
    
    def check_valid_content_type(request: Request) -> bool : ...
    async def response_application_octet_stream(request : Request) -> torch.tensor : ...
    async def response_application_json(request: Request) -> torch.tensor : ...


class Response_HTTP_1_1(Response):
    def __init__(self, cfg):
        self.cfg = cfg
    
    def _get_content_type(self, request):
        return request.headers.get('content-type', '').lower().split(';')[0].strip()
    
    def check_valid_content_type(self, request : Request):
        valid_content_type = self.cfg.contentType

        content_type = self._get_content_type(request)
        
        if not content_type in valid_content_type:
            SomniAI_log('[Warning] Invalid Content-Type:', content_type)
            raise HTTPException(status_code=415, detail=f"Only {valid_content_type} is supported.")

        return True
        
    async def response_application_octet_stream(self, request : Request) -> torch.tensor:
        content_type = self._get_content_type(request)

        if not content_type == 'application/octet-stream':
            SomniAI_log("Only application/octet-stream Content-Type is valid!")
            raise HTTPException(status_code=400, detail="Invalid Content Type. Please send application/octet-stream")
    
        try:
            body = await request.body()
            dataset = torch.load(BytesIO(body))
        except Exception as e:
            SomniAI_log('[Error] Failed to parse data from body:', str(e))
            raise HTTPException(status_code=400, detail="Invalid tensor data.")

        return dataset
    
    async def response_application_json(self, request) -> torch.tensor:
        content_type = self._get_content_type(request)

        if not content_type == 'application/json':
            SomniAI_log("Only application/json Content-Type is valid!")
            raise HTTPException(status_code=400, detail="Invalid Content Type. Please send application/json")
        
        try:
            json_body = await request.json()
            base64_img = json_body.get('image')
            dataset = self.cfg.process_base64_to_tensor(base64_img)
        except Exception as e:
            SomniAI_log('[Error] Failed to parse data from body:', str(e))
            raise HTTPException(status_code=400, detail="Invalid tensor data.")
    
    