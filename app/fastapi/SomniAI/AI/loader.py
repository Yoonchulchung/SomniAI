import torch
from ultralytics import YOLO
from SomniAI.log import SomniAI_log

MAX_GPU_MEMRY_GB = 24.0 
BATCH_THRESHOLD = 30

_loaded_models = {}

def load_model(model_name, gpu_id):
    
    available_models = {'YOLO_V8', 'YOLO_V11'}
    
    if model_name not in available_models:
        raise ValueError(f"Model should be one of these: {available_models}")

    if model_name in _loaded_models:
        SomniAI_log(f"{model_name} is loaded from cache")
        return _loaded_models[model_name]
    
    models = {
        'YOLO_V8' : YOLO("yolov8n-pose.pt"),
        'YOLO_V11' : YOLO("yolo11n-pose.pt"),
    }

    try:
        total = torch.cuda.get_device_properties(gpu_id).total_memory
        reserved = torch.cuda.memory_reserved(gpu_id)
        allocated = torch.cuda.memory_allocated(gpu_id)
        free = total - reserved - allocated

        SomniAI_log(
            f"GPU {gpu_id} memory check → total: {total/1e9:.2f} GB, free: {free/1e9:.2f} GB"
        )
        if free > 1 * 1024**3:
                    device = f"cuda:{gpu_id}"
        else:
            SomniAI_log(
                f"GPU {gpu_id} memory insufficient, loading {model_name} on CPU"
            )
            
    except Exception as e:
        SomniAI_log(f"GPU check failed: {e}, fallback to CPU")
        
    model = models.get(model_name).to(get_device(gpu_id)).eval()
    _loaded_models[model_name] = model
    
    SomniAI_log(f"{model_name} is loaded!")
    return model

        
def get_device(gpu_id):
    
    assert gpu_id in list(range(torch.cuda.device_count())), \
       f"gpu_id should be between 0 and {torch.cuda.device_count() - 1}"
       
    device = f'cuda:{gpu_id}' if torch.cuda.is_available() else 'cpu'
    SomniAI_log(f'[{device}] is used for AI')
    
    return device
