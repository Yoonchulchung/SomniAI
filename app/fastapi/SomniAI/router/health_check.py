import platform
import psutil

import torch
from typing import Protocol, Any
from fastapi import Request
from SomniAI.log import SomniAI_log

class HealthCheck(Protocol):
    async def parse_client(self, request) -> None: 
        raise NotImplementedError

    
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
    
    async def _get_server_status(self, ) -> dict[str, Any]:
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
        
        return await self._get_server_status()