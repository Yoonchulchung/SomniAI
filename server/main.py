from fastapi import FastAPI, Request
from ultralytics import YOLO
import uvicorn
import PIL
from PIL import Image
import io
import asyncio
import base64


app = FastAPI()

gpu_lock = asyncio.Lock()
gpu_queue = asyncio.Queue()

model = YOLO("yolov8n-pose.pt").to("cuda:0")
model.eval()

MAX_GPU_MEMRY_GB = 24.0


@app.on_event("startup")
async def init_queue():
    for i in range(100):
        await gpu_queue.put(i)
        
        
@app.get("/")
def main():
    return {"message": "Hello, World!"}

import AI
async def use_gpu(client_id: int, request: Request):
    print(f"Client {client_id} is waiting for the GPU ...")
    
    async with gpu_lock:
        print(f"Client {client_id} is using the GPU ...")
        data = await request.json()
        image_base64 = data.get("image")
        image_byte = base64.b64decode(image_base64)
        predictions = AI.predict(model, image_byte)
        
        ### Process the predictions as needed
        print(f"Client {client_id} has finished using the GPU.")
        

@app.post("/predict")
async def predict(request: Request):
    # Make sure only one request is able to use the GPU at a time
    client_id = id(request)
    ticket = await gpu_queue.get()
    try:
        await use_gpu(client_id, request)
        return {"client_id": client_id, "ticket": ticket}
    finally:
        await gpu_queue.put(ticket)
        
    
    return {"message" : "GOOD!"}

if __name__ == "__main__":
    uvicorn.run(app, host="localhost", port=8000, reload=False)    