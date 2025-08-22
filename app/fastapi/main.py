from fastapi import FastAPI, Request, HTTPException, File, UploadFile, Depends
from typing import Optional, List, Union
import asyncio

import AI

import torch

import SomniAI
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
    
    for i in range(torch.cuda.device_count()):
        model = AI.load_model('YOLO_V8', gpu_id=i)
        gpu_cfg.models.append(model)
    
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
@app.post("/upload/http_1_1")
async def upload_http_1_1(request : Request, files: Optional[List[UploadFile]] = File(None), 
                 parser = Depends(get_HTTP_parser), gpu = Depends(get_GPU)):
    '''
    Please send bytes data. Do not send Pytorch Tensor format.
    '''

    dataset = await parser.get_tensor(request, files)
    await gpu.enqueue_batch_or_tensor(dataset)   

    return {"msg": "succeed to send data"}

# FastAPI is the best choice?

########################################################################
#        Debug
########################################################################

def get_healtcheck():
    return SomniAI.Rsponse_Health_Check()
import json
@app.api_route("/health", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
async def health(request: Request, parser=Depends(get_healtcheck)):
    return await parser.parse_client(request)
    
@app.post("/test")
async def test(request: Request):
    return {'request' : request}