from fastapi import FastAPI
from ultralytics import YOLO
import uvicorn
import PIL
from PIL import Image
import io


app = FastAPI()

model = YOLO("yolov8n-pose.pt").to("cuda:0")
model.eval()



@app.get("/")
def main():
    return {"message": "Hello, World!"}


@app.post("/predict")
def predict(image: bytes):
    
    image = Image.open(io.BytesIO(image))
    predictions = model(image, verbose=False)
    
    return {"message" : "GOOD!"}

if __name__ == "__main__":
    uvicorn.run(app, host="localhost", port=8000, reload=False)    