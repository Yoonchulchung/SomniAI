from fastapi import Request, HTTPException, UploadFile, File
import torch
from typing import Optional, Protocol, Any

import asyncio
import base64
from PIL import Image
import torchvision.transforms as transforms
import io
import socket

from .log import SomniAI_log


class TensorParser(Protocol):
    async def get_tensor(self, request : Request) -> torch.Tensor: ...
    

#======================================================================================
# Response HTTP/1.1
#======================================================================================
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
                raise HTTPException(status_code=400, detail="Invalid image data. Don't send tensor!")
        
            return self._img_bytes_to_tensor(body)
        
        except Exception as e:
            SomniAI_log('[Error] Failed to parse data from body:', str(e))
            raise HTTPException(status_code=400, detail=f"Error : {e}")

    
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
            raise HTTPException(status_code=400, detail=f"Error : {e}")
        
    
    async def _get_tensor_from_multipart(self, request) -> torch.Tensor:
        ...
        
        
    async def get_tensor(self, request : Request, files : Optional[UploadFile] = File(None)) -> torch.Tensor:
        
        client_host=request.client.host
        hostname, _, _ = socket.gethostbyaddr(client_host)

        print(f"{hostname} sent!")
        
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
        
        
import time
import AI
#======================================================================================
# Process GPU
#======================================================================================s
class ProcessGPU():
    
    def __init__(self, cfg):
        self.cfg = cfg

    async def enqueue_batch_or_tensor(self, dataset):
        
        if dataset.ndim == 4:
            for img in dataset:          # shape: [N, C, H, W]
                await self.cfg.request_queue.put(img)
        elif dataset.ndim == 3:
            await self.cfg.request_queue.put(dataset)  # single image
        else:
            raise HTTPException(status_code=400, detail="Invalid tensor shape")

    async def enque_gpu(self, id):
        await self.cfg.gpu_available.put(id)
        
    
    async def micro_batch_schdeuler(self, ):
        '''
        Make Batch until GPU is available.
        '''
        batch = []
        
        while True:
            try:
                if len(batch) < self.cfg.BATCH_THRESHOLD :
                    img = await asyncio.wait_for(self.cfg.request_queue.get(), timeout=self.cfg.BATCH_TIMEOUT)
                    batch.append(img)

            except asyncio.TimeoutError:
                pass
            
            if batch and self.cfg.gpu_available.qsize() > 0:
                gpu_id = await self.cfg.gpu_available.get()

                batch_tensor = torch.stack(batch, dim=0)
                batch = []
                batch_tensor = AI.preprocess(batch_tensor)

                asyncio.create_task(self._run_inference(self.cfg.models, batch_tensor, gpu_id))
            
            
    async def _run_inference(self, model, batch, gpu_id):
        
        start_time = time.time()
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, AI.predict, model, batch, gpu_id)
        await self.cfg.gpu_available.put(gpu_id)
        
#======================================================================================
# Response Health Check
#======================================================================================
import platform
import psutil

class HealthCheck(Protocol):
    async def parse_client(self, request) -> None: ...

    
class Rsponse_Health_Check(HealthCheck):
    
    def __init__(self, ):
        ...
        
    async def _print_clients_info(self, request : Request) -> None:
        client_id = request.client.host
        client_port = request.client.port
        client_method=request.method
        client_header = request.headers.get("content-type")
        
        #Cookies are ignored in case of an invalid cookie. (RFC2109)
        client_cookie = request.cookies.get("mycookie", "<no cookie>")
        client_body = await request.body()
                
        http_version = request.scope.get("http_version")
        user_agent = request.headers.get("user-agent", "<no user-agent>")
        query_params = dict(request.query_params)
        request_url = str(request.url)

        message=[
            f"\n----- FastAPI Server Health Check -----\n",
            f"Client:       {client_id}:{client_port} [{client_method} HTTP/{http_version}]\n",
            f"Content-Type: {client_header}\n",
            f"Full URL:     {request_url}\n",
            f"Query Params: {query_params}\n",
            f"Cookie:       mycookie={client_cookie}\n",
            f"User-Agent:   {user_agent}\n",
            f"Body Length:  {len(client_body)} bytes\n",
            f"------------------------------------------",
        ]
        
        SomniAI_log(*message)
    
    async def _get_message(self, ) -> dict[str, Any]:
        os_info = f"{platform.system()} {platform.release()} ({platform.version()})"
        cpu_info = platform.processor()
        memory = psutil.virtual_memory()
        mem_info = f"{memory.used / (1024**3):.2f}GB / {memory.total / (1024**3):.2f}GB"
        
        gpu_info = []
        if torch.cuda.is_available():
            for i in range(torch.cuda.device_count()):
                gpu_name = torch.cuda.get_device_name(i)
                gpu_mem = torch.cuda.get_device_properties(i).total_memory / (1024**3)
                gpu_info.append(f"GPU {i}: {gpu_name} ({gpu_mem:.1f} GB)")
        else:
            gpu_info.append("No GPU available")
            
        return {
            "status" : "true",
            "os": os_info,
            "cpu": cpu_info,
            "memory": mem_info,
            "gpu": gpu_info
        }
        
    async def parse_client(self, request) -> dict[str, Any]:
        client_request=request
        await self._print_clients_info(client_request)
        
        return await self._get_message()