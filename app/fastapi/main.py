from fastapi import FastAPI, Request, File, UploadFile, Depends
from typing import Optional, List
import asyncio
import torch

import SomniAI
import SomniAI.AI as AI
from SomniAI import log
########################################################################
#        Init
########################################################################
from contextlib import asynccontextmanager
@asynccontextmanager
async def lifespan(app: FastAPI):
    log.SomniAI_log("=" * 10, " SomniAI FastAPI Server ", "=" * 10)
    
    gpu_cfg = SomniAI.config.ServiceGPUConfig()
    gpu = SomniAI.ProcessGPU(gpu_cfg)
    
    if torch.cuda.device_count():
        for i in range(torch.cuda.device_count()):
            model = AI.load_model('YOLO_V8', gpu_id=i)
            gpu_cfg.models.append(model)
    else:
        log.SomniAI_log("Failed to load model due to no available GPU")
        
    asyncio.create_task(gpu.micro_batch_schdeuler())
    for id in range(torch.cuda.device_count()):
        await gpu.enque_gpu(id)    
    yield
    
    log.SomniAI_log("Bye!")

app = FastAPI(lifespan=lifespan)

def get_HTTP_cfg():
    return SomniAI.config.ServiceHTTPConfig()

def get_HTTP_parser(cfg = Depends(get_HTTP_cfg)):
    return SomniAI.Response_HTTP_1_1(cfg)

def get_GPU_cfg():
    return SomniAI.config.ServiceGPUConfig()

def get_GPU(cfg = Depends(get_GPU_cfg)):
    return SomniAI.ProcessGPU(cfg)

########################################################################
#        Upload
########################################################################

import time
@app.post("fastapi/upload/http_1_1")
async def upload_http_1_1(request : Request, files: Optional[List[UploadFile]] = File(None), 
                 http = Depends(get_HTTP_parser), gpu = Depends(get_GPU)):
    '''
    Please send bytes data. Do not send Pytorch Tensor format.
    '''

    dataset = await http.get_tensor(request, files)
    await gpu.enqueue_batch_or_tensor(dataset)   

    return {"msg": "succeed to send data"}

# FastAPI is the best choice?



########################################################################
#        Debug
########################################################################
import requests

def get_healtcheck():
    return SomniAI.Rsponse_Health_Check()
import json
@app.api_route("/fastapi/health", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
async def health(request: Request, parser=Depends(get_healtcheck)):
    return await parser.parse_client(request)
    
@app.post("fastapi/ping")
async def ping(request: Request):
    return {'request' : request}