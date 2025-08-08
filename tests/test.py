
from utils import request
from utils import image

def main():

    image_base64 = image.get_image_base64('../data/samples/image_000043.png')
    response = request.send_json_to_server(image_base64, 'http://localhost:8000/')
    
    if response:
        ...
        
import torch
import os
import requests
import io

def send_dumy_data():
    server_url = 'http://127.0.0.1:8000/upload/octet-stream'
    
    tmp_dir = './tmp'
    
    os.mkdir(tmp_dir) if not os.path.exists(tmp_dir) else None
    dummy_data = torch.randn(30, 3, 640, 640)        
    
    buf = io.BytesIO()
    torch.save(dummy_data, buf)
    buf.seek(0)
    
    headers = {"Content-Type": "application/octet-stream"}
    resp = requests.post(server_url, data=buf.read(), headers=headers)
    
    
if __name__ == "__main__":
    for _ in range (100):
        send_dumy_data()