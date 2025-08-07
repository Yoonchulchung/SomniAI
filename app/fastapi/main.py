from fastapi import FastAPI, Request, File, UploadFile
import uvicorn
import asyncio
from typing import Optional

import utils
import AI

import torch

########################################################################
#        Init
########################################################################
gpu_available = asyncio.Queue()
request_queue = asyncio.Queue()

from contextlib import asynccontextmanager
@asynccontextmanager
async def lifespan(app: FastAPI):
    asyncio.create_task(batch_schdeuler())
    asyncio.create_task(process_data())
    
    gpu_available.put(list(range(torch.cuda.device_count())))
    yield
    
    utils.SomniAI_log("Bye!")

app = FastAPI(lifespan=lifespan)

########################################################################
#        Upload
########################################################################
@app.post("/upload")
async def upload(request : Request, file: Optional[UploadFile] = File(...)):
    
    cl_img = await file.read() if file else (await request.json()).get("image")
    utils.SomniAI_log("[Warning] Please send multipart/form-data") \
                                    if file is None else None
    
    await request_queue.put(cl_img)
    return {'msg' : 'succeed to send data'}

########################################################################
#        Process
########################################################################
models = []

for i in range(torch.cuda.device_count()):
    model = AI.load_model('YOLO_V8', gpu_id=i)
    models.append(models)

max_concurrent_gpus = 2
MAX_GPU_MEMRY_GB = 24.0 
BATCH_THRESHOLD = 30

async def batch_schdeuler():
    while True:
        batch = []
        first_item = await request_queue.get()
        batch.append(first_item)
        
        # try:
        #     for _ in range()

async def process_data():
    ...

import requests
async def send_result():
    response = requests.post()

########################################################################
#        Debug
########################################################################

@app.get("/stauts")
async def status(request: Request):
    return {'status' : 'active'}

@app.post("/test")
async def test(request: Request):
    return {'request' : request}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False) 