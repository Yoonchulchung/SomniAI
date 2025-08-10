from fastapi import FastAPI, Request, HTTPException, File, UploadFile
from typing import Optional, List, Union
import uvicorn
import asyncio

from utils import SomniAI_log
import AI
import utils

import torch
########################################################################
#        Init
########################################################################
gpu_available = asyncio.Queue()
request_queue = asyncio.Queue()

from contextlib import asynccontextmanager
@asynccontextmanager
async def lifespan(app: FastAPI):
    SomniAI_log("=" * 10, " SomniAI FastAPI Server ", "=" * 10)
    
    for i in range(torch.cuda.device_count()):
        model = AI.load_model('YOLO_V8', gpu_id=i)
        models.append(model)
        
    asyncio.create_task(micro_batch_schdeuler())
    for id in range(torch.cuda.device_count()):
        await gpu_available.put(id)    
    yield
    
    SomniAI_log("Bye!")

app = FastAPI(lifespan=lifespan)

########################################################################
#        Upload
########################################################################
from io import BytesIO

async def _enqueue_batch_or_tensor(dataset):
    
    if dataset.ndim == 4:
        for img in dataset:          # shape: [N, C, H, W]
            await request_queue.put(img)
    elif dataset.ndim == 3:
        await request_queue.put(dataset)  # single image
    else:
        raise HTTPException(status_code=400, detail="Invalid tensor shape")


def _is_probably_tensor_file(f: UploadFile) -> bool:
    return (
        (f.content_type or "").lower().startswith("application/octet-stream")
        or (f.filename or "").lower().endswith((".pt", ".pth", ".pth.tar"))
    )


@app.post("/upload/application")
async def upload_application(request: Request):
    '''
    Please send only binary data in the [B, C, H, W] or [C, H, W] format.
    '''
    
    avail_content_type = ['application/octet-stream', 'application/json']
    content_type = request.headers.get('content-type', '').lower().split(';')[0].strip()
    
    if not content_type in avail_content_type:
            SomniAI_log('[Warning] Invalid Content-Type:', content_type)
            raise HTTPException(status_code=415, detail=f"Only {avail_content_type} is supported.")

    if content_type == 'application/octet-stream':
        try:
            body = await request.body()
            dataset = torch.load(BytesIO(body))
        except Exception as e:
            SomniAI_log('[Error] Failed to parse data from body:', str(e))
            raise HTTPException(status_code=400, detail="Invalid tensor data.")
        
    elif content_type == 'application/json':
        try:
            json_body = await request.json()
            base64_img = json_body.get('image')
            dataset = utils.process_base64_to_tensor(base64_img)
        except Exception as e:
            SomniAI_log('[Error] Failed to parse data from body:', str(e))
            raise HTTPException(status_code=400, detail="Invalid tensor data.")
        
    else:
        ...
    await _enqueue_batch_or_tensor(dataset)   

    return {"msg": "succeed to send data"}


@app.post("/upload/multipart")
async def upload_multipart(request : Request, files: List[UploadFile] = File(...)):
    
    content_type = request.headers.get('content-type', '').lower()
    if not content_type.startswith('multipart/form-data'):
            SomniAI_log('[Warning] Invalid Content-Type:', content_type)
            raise HTTPException(status_code=415, detail="Only multipart/form-data is supported.")

    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")

    processed = 0
    for f in files:
        try:
            raw = await f.read()
            
            # This is for (.pt) file
            if _is_probably_tensor_file(f):
                dataset = torch.load(BytesIO(raw), map_location="cpu")
                await _enqueue_batch_or_tensor(dataset)
                processed += (dataset.shape[0] if dataset.ndim == 4 else 1)
                continue
        except Exception as e:
            SomniAI_log('[Error] Failed to parse data from body:', str(e))
            raise HTTPException(status_code=400, detail="Invalid tensor data.")
    
    return {'msg' : 'succeed to send data'}
            
    
# FastAPI is the best choice?

########################################################################
#        Inference
########################################################################
models = []
BATCH_TIMEOUT = 1.0 # 1sec
BATCH_THRESHOLD = 256


async def micro_batch_schdeuler():
    '''
    Make Batch until GPU is available.
    '''
    batch = []
    
    while True:
        try:
            if len(batch) < BATCH_THRESHOLD :
                img = await asyncio.wait_for(request_queue.get(), timeout=BATCH_TIMEOUT)
                batch.append(img)

        except asyncio.TimeoutError:
            pass
        
        if batch and gpu_available.qsize() > 0:
            gpu_id = await gpu_available.get()

            batch_tensor = torch.stack(batch, dim=0)
            batch = []
            batch_tensor = AI.preprocess(batch_tensor)

            asyncio.create_task(run_inference(models, batch_tensor, gpu_id))
                
            
import time
async def run_inference(model, batch, gpu_id):
    
    start_time = time.time()
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, AI.predict, model, batch, gpu_id)
    await gpu_available.put(gpu_id)
    

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