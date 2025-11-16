import base64
import io
from abc import ABC, abstractmethod
from typing import Optional

import torch
import torchvision.transforms as transforms
from fastapi import File, HTTPException, Request, UploadFile
from PIL import Image

from inference.application.logger import SomniAI_log


class Parser(ABC):
    '''
    클라이언트의 요청을 분석하는 역할을 합니다. 허용되는 요청의 Content Type은 아래와 같습니다.

        - multipart/form-data
        - application/octet-stream
        - application/json
        - application/x-www-form-urlencoded

    '''

    def __init__(self, cfg):
        self.cfg = cfg

    async def _img_from_form_data(self, request: Request):
        '''
        multipart/form-data 요청에서 image를 추출합니다.
        '''
        return None

    async def _img_from_octet_stream(self, request: Request):
        '''
        application/octet-stream 요청에서 image를 추출합니다.
        '''
        try:
            body = await request.body()

            if not _is_image_bytes(body):
                raise HTTPException(status_code=400, detail="Invalid image data. Don't send tensor!")

            return self._convert_bytes_to_image(body)

        except Exception as e:
            SomniAI_log('[Error] Failed to parse data from body:', str(e))
            raise HTTPException(status_code=400, detail=f"Error : {e}")

    async def _img_from_json(self, request: Request):
        '''
        application/json 요청에서 image를 추출합니다.
        '''
        try:
            json_body = await request.json()
            base64_img = json_body.get('image')

            bytes_data = _decode_base64(base64_img)

            if not _is_image_bytes(bytes_data):
                raise HTTPException(status_code=400, detail="Invalid image data. Don't send tensor!")

            return self._convert_bytes_to_image(bytes_data)
        except Exception as e:
            SomniAI_log('[Error] Failed to parse data from body:', str(e))
            raise HTTPException(status_code=400, detail=f"Error : {e}")

    async def _img_from_urlencoded(self, request: Request):
        '''
        application/x-www-form-urlencoded 요청에서 image를 추출합니다.
        '''
        return None

    @abstractmethod
    def _convert_bytes_to_image(self, byte_data: bytes):
        '''
        bytes 데이터를 이미지로 변환합니다.
        자식 클래스에서 반드시 구현해야 합니다.
        '''
        raise NotImplementedError

    async def get_img(self, request: Request, files: Optional[UploadFile] = File(None)):

        handlers = {
                    'multipart/form-data': self._img_from_form_data,
                    'application/octet-stream': self._img_from_octet_stream,
                    'application/json': self._img_from_json,
                    'application/x-www-form-urlencoded': self._img_from_urlencoded,
                }

        ct = _get_content_type(request)

        handler = handlers.get(ct)

        if handler is None:
            SomniAI_log('[Warning] Invalid Content-Type:', ct)
            allow = ', '.join(sorted(handlers.keys()))
            raise HTTPException(status_code=415, detail=f"Only [{allow}] is supported.")

        if files:
            return await handler(request, files)
        else:
            return await handler(request)


class RequestParserTensor(Parser):
    def __init__(self, cfg):
        super().__init__(cfg)

    def _convert_bytes_to_image(self, byte_data: bytes) -> torch.Tensor:
        '''bytes를 Tensor로 변환'''
        return _img_bytes_to_tensor(byte_data)


class RequestParserPIL(Parser):
    def __init__(self, cfg):
        super().__init__(cfg)

    def _convert_bytes_to_image(self, byte_data: bytes) -> Image.Image:
        '''bytes를 PIL Image로 변환'''
        return _image_bytes_to_pil(byte_data)
    
        
def _get_content_type(request):
        return request.headers.get('content-type', '').lower().split(';')[0].strip()
    
    
def _decode_base64(img) -> bytes:
    '''
    Not Recommended to ues base64 due to long delay in encoding and decoding process.
    ''' 
    img = base64.b64decode(img) if _is_base64(img) else img
    return img


def _is_base64(s: str) -> bool:
    if not s or not isinstance(s, str):
        return False
    try:
        base64.b64decode(s, validate=True)
        return True
    except Exception:
        return False


def _is_image_bytes(b: bytes) -> bool:
        return (
            b.startswith(b"\xFF\xD8\xFF") or                         # JPEG
            b.startswith(b"\x89PNG\r\n\x1a\n") or                    # PNG
            (b.startswith(b"RIFF") and b[8:12] == b"WEBP") or        # WEBP
            b.startswith(b"BM") or                                   # BMP
            b.startswith(b"GIF87a") or b.startswith(b"GIF89a")       # GIF
        )


def _img_bytes_to_tensor(byte_data : bytes) -> torch.Tensor:
        try:
            img = Image.open(io.BytesIO(byte_data)).convert('RGB')
            t_tensor = transforms.ToTensor()
            return t_tensor(img)
        except Exception as e:
            raise ValueError(f"Failed to decode image: {e}")
        
        
def _image_bytes_to_pil(byte_data : bytes) -> Image.Image:
    image_stream = io.BytesIO(byte_data)
    image = Image.open(image_stream)
    image = image.convert("RGB")
    return image