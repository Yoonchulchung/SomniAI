import torch
from ultralytics import YOLO
from SomniAI.log import SomniAI_log

MAX_GPU_MEMRY_GB = 24.0 
BATCH_THRESHOLD = 30

def load_model(model_name, gpu_id):
    available_models = ['YOLO_V8', 'YOLO_V11']
    
    if model_name not in available_models:
        raise ValueError(f"Model should be one of these: {available_models}")

    if model_name == 'YOLO_V8':
        model = YOLO("yolov8n-pose.pt")
    elif model_name == 'YOLO_V11':
        model = YOLO("yolo11n-pose.pt")

    SomniAI_log(f"{model_name} is loaded!")
    return model.to(get_device(gpu_id)).eval()

        
def get_device(gpu_id):
    
    assert gpu_id in list(range(torch.cuda.device_count())), \
       f"gpu_id should be between 0 and {torch.cuda.device_count() - 1}"
       
    device = f'cuda:{gpu_id}' if torch.cuda.is_available() else 'cpu'
    SomniAI_log(f'[{device}] is used for AI')
    
    return device
