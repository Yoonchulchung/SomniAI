import torch
from ultralytics import YOLO
from utils.print import SomniAI_log


def get_device():
    device = 'cuda:0' if torch.cuda.is_available() else 'cpu'
    SomniAI_log(f'[{device}] is used for AI')
    
    return device


def load_model(model_name):
    available_models = ['YOLO_V8', 'YOLO_V11']
    
    if model_name not in available_models:
        raise ValueError(f"Model should be one of these: {available_models}")

    if model_name == 'YOLO_V8':
        model = YOLO("yolov8n-pose.pt")
    elif model_name == 'YOLO_V11':
        model = YOLO("yolo11n-pose.pt")

    SomniAI_log(f"{model_name} is loaded!")
    return model.to(get_device()).eval()