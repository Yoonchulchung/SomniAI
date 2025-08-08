from fastapi import FastAPI, Request, HTTPException
import uvicorn
import asyncio

from utils import SomniAI_log
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

@app.post("/upload/octet-stream")
async def upload_octet_stream(request: Request):
    '''
    Only Content-Type : application/octet-stream is available
    '''
    content_type = request.headers.get('content-type', '').lower()
    
    if not content_type.startswith('application/octet-stream'):
            SomniAI_log('[Warning] Invalid Content-Type:', content_type)
            raise HTTPException(status_code=415, detail="Only application/octet-stream is supported.")

    try:
        body = await request.body()
    except Exception as e:
        SomniAI_log('[Error] Failed to parse data from body:', str(e))
        raise HTTPException(status_code=400, detail="Invalid tensor data.")
    
    # ================================================
    dataset = torch.load(BytesIO(body))
    
    if dataset.ndim == 4:
        for img in dataset:          # shape: [N, C, H, W]
            await request_queue.put(img)
    elif dataset.ndim == 3:
        await request_queue.put(dataset)  # single image
    else:
        raise HTTPException(status_code=400, detail="Invalid tensor shape")

    return {"msg": "succeed to send data"}
        
@app.post("/upload/json")
async def upload_base64():
    ...
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
            batch_tensor = torch.stack(batch, dim=0)
            batch_tensor = AI.preprocess(batch_tensor)
            batch = []

            gpu_id = await gpu_available.get()
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