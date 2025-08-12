from fastapi import Request, HTTPException, UploadFile, File
import torch
from typing import Optional

from typing import Protocol
from io import BytesIO
import asyncio
import base64
from PIL import Image
import torchvision.transforms as transforms
import io

from .log import SomniAI_log


class TensorParser(Protocol):
    async def get_tensor(self, request : Request) -> torch.Tensor: ...
    
    
class Response_HTTP_1_1(TensorParser):
    def __init__(self, cfg):
        self.cfg = cfg
    
    def _get_content_type(self, request):
        return request.headers.get('content-type', '').lower().split(';')[0].strip()
    
    def _decode_base64(self, img) -> bytes:
        '''
        Not Recommended to ues base64 due to long delay in encoding and decoding process.
        ''' 
        img = base64.b64decode(img) if self._is_base64(img) else img
        return img
    
    def _is_base64(self, s: str) -> bool:
        if not s or not isinstance(s, str):
            return False
        try:
            base64.b64decode(s, validate=True)
            return True
        except Exception:
            return False
    
    def _is_image_bytes(self, b: bytes) -> bool:
        return (
            b.startswith(b"\xFF\xD8\xFF") or                         # JPEG
            b.startswith(b"\x89PNG\r\n\x1a\n") or                    # PNG
            (b.startswith(b"RIFF") and b[8:12] == b"WEBP") or        # WEBP
            b.startswith(b"BM") or                                   # BMP
            b.startswith(b"GIF87a") or b.startswith(b"GIF89a")       # GIF
        )
        
    def _img_bytes_to_tensor(self, data : bytes) -> torch.Tensor:
        try:
            img = Image.open(io.BytesIO(data)).convert('RGB')
            t_tensor = transforms.ToTensor()
            return t_tensor(img)
        except Exception as e:
            raise ValueError(f"Failed to decode image: {e}")

    async def _get_tensor_from_octet_stream(self, request : Request) -> torch.Tensor:

        try:
            body = await request.body()
            
            if not self._is_image_bytes(body):
                raise HTTPException(status_code=400, detail=f"Please available Data!")        
        
            return self._img_bytes_to_tensor(body)
        
        except Exception as e:
            SomniAI_log('[Error] Failed to parse data from body:', str(e))
            raise HTTPException(status_code=400, detail="Invalid tensor data.")

    
    async def _get_tensor_from_json(self, request) -> torch.Tensor:

        try:
            json_body = await request.json()
            base64_img = json_body.get('image')
            bytes = self._decode_base64(base64_img)
            
            if not self._is_image_bytes(bytes):
                raise HTTPException(status_code=400, detail="Invalid image data. Don't send tensor!")
            
            return self._img_bytes_to_tensor(bytes)
        except Exception as e:
            SomniAI_log('[Error] Failed to parse data from body:', str(e))
            raise HTTPException(status_code=400, detail="Invalid tensor data.")
        
    
    async def _get_tensor_from_multipart(self, request) -> torch.Tensor:
        ...
        
        
    async def get_tensor(self, request : Request, files : Optional[UploadFile] = File(None)) -> torch.Tensor:
        ct = self._get_content_type(request)
        handlers = {
                    'application/octet-stream' : self._get_tensor_from_octet_stream,
                    'application/json' : self._get_tensor_from_json,
                    'multipart/form-data' : self._get_tensor_from_multipart,
                }
        
        handler = handlers.get(ct)
        
        if handler is None:
            SomniAI_log('[Warning] Invalid Content-Type:', ct)
            allow = ', '.join(sorted(handlers.keys()))
            raise HTTPException(status_code=415, detail=f"Only {set(allow)} is supported.")

        if files:
            return await handler(request, files)
        else:
            return await handler(request)