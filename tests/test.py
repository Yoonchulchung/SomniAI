
from utils import request
from utils import image

def send_json_data():

    image_base64 = image.get_image_base64('../data/samples/image_000043.png')
    response = request.send_json_to_server(image_base64, 'http://localhost:8000/upload/application')
    
    if response:
        ...
        
import torch
import os
import requests
import io
from concurrent.futures import ThreadPoolExecutor

def send_octet_data():
    server_url = 'http://127.0.0.1:8000/upload/application'
    
    tmp_dir = './tmp'
    
    os.mkdir(tmp_dir) if not os.path.exists(tmp_dir) else None
    dummy_data = torch.randn(10, 3, 640, 640)        
    
    buf = io.BytesIO()
    torch.save(dummy_data, buf)
    buf.seek(0)
    payload = buf.getvalue()
    
    headers = {"Content-Type": "application/octet-stream"}

    print("Sending Data....")
    
    session = requests.Session()
    def send_once():
        return session.post(server_url, data=payload, headers=headers)

    def flood_requests(total_requests=1000, concurrency=50):
        with ThreadPoolExecutor(max_workers=concurrency) as exe:
            futures = [exe.submit(send_once) for _ in range(total_requests)]

            statuses = [f.result().status_code for f in futures]
        print(f"Done. codes: {set(statuses)}")
        
    flood_requests(10, 20)
    
if __name__ == "__main__":
    send_json_data()