import base64
import io
from abc import ABC, abstractmethod
from typing import List, Optional, Union

import numpy as np
import torch
import torchvision.transforms as transforms
from fastapi import File, HTTPException, Request, UploadFile
from PIL import Image, UnidentifiedImageError

from modules.inference.application.logger import SomniAI_log


class Parser(ABC):
    # (320, 240), (640, 480), (1280, 720), (1920, 1080) 해상도 허용

    def __init__(self, cfg):
        self.cfg = cfg
    
    @abstractmethod
    def _convert_bytes_to_image(self, byte_data: bytes):
        raise NotImplementedError

    async def _img_from_form_data(self, request: Request, files: Union[UploadFile, List[UploadFile]] = None):
        try:
            if not files:
                raise HTTPException(status_code=400, detail="No file uploaded.")

            if isinstance(files, list):
                if len(files) == 0:
                    raise HTTPException(status_code=400, detail="Empty file list.")
                target_file = files[0]
            else:
                target_file = files

            contents = await target_file.read()
            return self._convert_bytes_to_image(contents)

        except HTTPException as he:
            raise he
        except Exception as e:
            SomniAI_log('[Error] Form-Data parsing failed:', str(e))
            raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")

    async def _img_from_json(self, request: Request):
        try:
            json_body = await request.json()
            base64_img = json_body.get('image')
            
            if not base64_img:
                raise HTTPException(status_code=400, detail="JSON body missing 'image' field.")

            bytes_data = _decode_base64(base64_img)

            return self._convert_bytes_to_image(bytes_data)
        except HTTPException as he:
            raise he
        except Exception as e:
            SomniAI_log('[Error] JSON parsing failed:', str(e))
            raise HTTPException(status_code=400, detail=f"Error processing JSON: {str(e)}")

    async def _img_from_octet_stream(self, request: Request, files=None):
        try:
            body = await request.body()

            if not body or len(body) == 0:
                raise HTTPException(status_code=400, detail="Empty body received.")

            return self._convert_bytes_to_image(body)

        except HTTPException as he:
            raise he
        except Exception as e:
            SomniAI_log('[Error] Octet-stream parsing failed:', str(e))
            raise HTTPException(status_code=400, detail=f"Error processing octet-stream: {str(e)}")

    async def _img_from_urlencoded(self, request: Request):
        return None

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

            if 'multipart/form-data' in ct:
                handler = self._img_from_form_data
            else:
                SomniAI_log('[Warning] Invalid Content-Type:', ct)
                allow = ', '.join(sorted(handlers.keys()))
                raise HTTPException(status_code=415, detail=f"Only [{allow}] is supported. Got: {ct}")

        if files:
            return await handler(request, files)
        else:
            return await handler(request)


class RequestParserTensor(Parser):
    def __init__(self, cfg):
        super().__init__(cfg)

    def _convert_bytes_to_image(self, byte_data: bytes) -> torch.Tensor:
        return _img_bytes_to_tensor(byte_data)


class RequestParserPIL(Parser):
    def __init__(self, cfg):
        super().__init__(cfg)

    def _convert_bytes_to_image(self, byte_data: bytes) -> Image.Image:
        return _image_bytes_to_pil(byte_data)


def _get_content_type(request):
    return request.headers.get('content-type', '').lower().split(';')[0].strip()


def _decode_base64(img: str) -> bytes:
    if not img or not isinstance(img, str):

        if isinstance(img, bytes):
            return img
        raise HTTPException(status_code=400, detail="Image data is not a string.")
    
    if "base64," in img:
        img = img.split("base64,")[1]
    
    try:
        return base64.b64decode(img, validate=True)
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to decode Base64 string.")


def _img_bytes_to_tensor(byte_data: bytes) -> torch.Tensor:
    try:
        img = Image.open(io.BytesIO(byte_data)).convert('RGB')
    except UnidentifiedImageError:
        img = _recover_raw_image(byte_data)
        
    t_tensor = transforms.ToTensor()
    return t_tensor(img)


def _image_bytes_to_pil(byte_data: bytes) -> Image.Image:
    try:
        image_stream = io.BytesIO(byte_data)
        image = Image.open(image_stream)
        image = image.convert("RGB")
        return image

    except UnidentifiedImageError:
        return _recover_raw_image(byte_data)

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image data: {e}")


def _recover_raw_image(byte_data: bytes) -> Image.Image:
    data_len = len(byte_data)

    # 640×120 RGBA
    if data_len == 640 * 120 * 4:
        width, height = 640, 120
        
        # RGBA → RGB
        arr = np.frombuffer(byte_data, dtype=np.uint8).reshape(height, width, 4)
        rgb = arr[:, :, :3]
            
        # 4배 확장
        rows_repeated = np.repeat(rgb, 4, axis=0)
        img_repeated = Image.fromarray(rows_repeated, 'RGB')

        return img_repeated
    
     # 320 x 240 Grayscale
    elif data_len == 320 * 240:
        img = Image.frombytes('L', (320, 240), byte_data, 'raw', 'L').convert('RGB')
        return img.resize((640, 480), Image.Resampling.LANCZOS)
    
    # 320 x 240 RGB
    elif data_len == 320 * 240 * 3:
        img = Image.frombytes('RGB', (320, 240), byte_data, 'raw', 'RGB')
        return img.resize((640, 480), Image.Resampling.LANCZOS)
    
    # 320 x 240 RGBA
    elif data_len == 320 * 240 * 4:
        img = Image.frombytes('RGBA', (320, 240), byte_data, 'raw', 'RGBA').convert('RGB')
        return img.resize((640, 480), Image.Resampling.LANCZOS)
    
    # 640x480 Grayscale
    elif data_len == 640 * 480:
        return Image.frombytes('L', (640, 480), byte_data, 'raw', 'L').convert('RGB')
    
    # 640x480 RGB
    elif data_len == 640 * 480 * 3:
        return Image.frombytes('RGB', (640, 480), byte_data, 'raw', 'RGB')
    
    # 640x480 RGBA
    elif data_len == 640 * 480 * 4:
        return Image.frombytes('RGBA', (640, 480), byte_data, 'raw', 'RGBA').convert('RGB')
    
    # 1280x720 Grayscale
    elif data_len == 1280 * 720:
        return Image.frombytes('L', (1280, 720), byte_data, 'raw', 'L').convert('RGB')
    
    # 1280x720 RGB
    elif data_len == 1280 * 720 * 3:
        return Image.frombytes('RGB', (1280, 720), byte_data, 'raw', 'RGB')
    
    # 1280x720 RGBA
    elif data_len == 1280 * 720 * 4:
        return Image.frombytes('RGBA', (1280, 720), byte_data, 'raw', 'RGBA').convert('RGB')
    
    # 1920x1080 Grayscale
    elif data_len == 1920 * 1080:
        return Image.frombytes('L', (1920, 1080), byte_data, 'raw', 'L').convert('RGB')
    
    # 1920x1080 RGB
    elif data_len == 1920 * 1080 * 3:
        return Image.frombytes('RGB', (1920, 1080), byte_data, 'raw', 'RGB')
    
    # 1920x1080 RGBA
    elif data_len == 1920 * 1080 * 4:
        return Image.frombytes('RGBA', (1920, 1080), byte_data, 'raw', 'RGBA').convert('RGB')

    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported data size: {data_len} bytes"
        )