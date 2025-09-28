import importlib
import os
import types
from dataclasses import asdict, dataclass, field, is_dataclass
from enum import Enum
from pathlib import Path
from typing import Any, Dict, Union

import numpy as np
import torch
import yaml

DTYPE_MAP = {
    "float32": torch.float32,
    "float16": torch.float16,
    "bfloat16": torch.bfloat16
}

VLM_MODEL_ID_MAP = {
    "BLIP" : "Salesforce/blip-image-captioning-base",
    "BLIP2": "Salesforce/blip2-opt-2.7b",
             # Salesforce/blip2-flan-t5-xl
             # Salesforce/blip2-flan-t5-xxl    
    "GIT" : "microsoft/git-large-coco",
            #"microsoft/git-base",
            # microsoft/git-base-coco
            # microsoft/git-large-coco
    "Llava" : "llava-hf/llava-1.5-7b-hf",
            # llava-hf/llava-1.5-13b-hf
            # llava-hf/llava-v1.6-vicuna-7b-hf
    "Qwen2VL" : "Qwen/Qwen2-VL-7B-Instruct",
            #"Qwen/Qwen2-VL-2B-Instruct",
            # Qwen/Qwen2-VL-7B-Instruct
            # "Qwen/Qwen2.5-Omni-7B"
    "Qwen3GG" : "Qwen/Qwen3Guard-Gen-4B"
            # Qwen/Qwen3Guard-Gen-4B
}

VISION_MODEL_ID_MAP = {
    "YOLO" : "yolov8n-pose.pt"
            # yolov8s-pose.pt
}




@dataclass
class FastAPIConfig:
    HOST: str = "localhost"
    PORT: int = 8000
    API_PREFIX: str = "/fastapi"
    WORKERS: int = 1
    RELOAD : bool = False
    LOG_LEVEL : str = "info"

@dataclass
class HTTPConfig:
    BATCH_THRESHOLD: int = 256
    BATCH_TIMEOUT: float = 1.0

@dataclass
class AIConfig:
    FREE_MEM_THRESHOLD: int = 2   # GB
    INFERENCE_MODE: str = None
    MODEL_NAME: str = None
    VLM_QUESTION : str = None
    VLM_PROMPT : str = None
    DEVICE_MAP : str = None
    MODEL_ID: str = None
    TASK_TYPE : str = None
    MAX_TOKENS : int = None
    DTYPE : torch.dtype = field(default=torch.float32)
    NORM_MEAN: tuple[float] = (0.485, 0.456, 0.406)
    NORM_STD:  tuple[float] = (0.229, 0.224, 0.225)

@dataclass
class Config:
    type: str = "develop"
    FASTAPI: FastAPIConfig = field(default_factory=FastAPIConfig)
    HTTP: HTTPConfig = field(default_factory=HTTPConfig)
    AI: AIConfig = field(default_factory=AIConfig)

    
def _get_config_file(config_path : str):
    
    if not os.path.exists(config_path):
        raise ValueError(f"{config_path} is not path")
    
    ext = os.path.splitext(config_path)[1].lower()

    if ext in [".yaml", ".yml"]:
        with open(config_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
            if not isinstance(data, dict):
                raise ValueError("YAML root must be a mapping (dict).")
            return data
        
    elif ext == ".py":
        spec = importlib.util.spec_from_file_location("config_module", config_path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)

        return module

    else:
        raise ValueError(f"Unsupported file type: {ext}")
        

def _parse_config(config_data : Union[Dict[str, Any], types.ModuleType, Config]) -> Config:
    
    
    if isinstance(config_data, types.ModuleType):
        if hasattr(config_data, "CONFIG") and isinstance(getattr(config_data, "CONFIG"), dict):
            config_data = getattr(config_data, "CONFIG")
        else:
            config_data = {
                "type": getattr(config_data, "type", "develop"),
                "FASTAPI": getattr(config_data, "FASTAPI", {}),
                "HTTP": getattr(config_data, "HTTP", {}),
                "AI": getattr(config_data, "AI", {}),
            }
            
    if not isinstance(config_data, dict):
        raise TypeError("config_data must be dict/module/Config")
    
    fastapi_raw = _get(config_data, "FASTAPI", {}) or {}
    http_raw    = _get(config_data, "HTTP", {}) or {}
    ai_raw      = _get(config_data, "AI", {}) or {}

    fastapi = FastAPIConfig(
        HOST=_get(fastapi_raw, "HOST", FastAPIConfig.HOST),
        PORT=int(_get(fastapi_raw, "PORT", FastAPIConfig.PORT)),
        API_PREFIX=_get(fastapi_raw, "API_PREFIX", FastAPIConfig.API_PREFIX),
        WORKERS=int(_get(fastapi_raw, "WORKERS", FastAPIConfig.WORKERS)),
        RELOAD=_get(fastapi_raw, "RELOAD", FastAPIConfig.RELOAD),
        LOG_LEVEL=_get(fastapi_raw, "LOG_LEVEL", FastAPIConfig.LOG_LEVEL),
    )
    
    http = HTTPConfig(
        BATCH_THRESHOLD=int(_get(http_raw, "BATCH_THRESHOLD", HTTPConfig.BATCH_THRESHOLD)),
        BATCH_TIMEOUT=float(_get(http_raw, "BATCH_TIMEOUT", HTTPConfig.BATCH_TIMEOUT)),
    )
    
    bf16_avail = torch.cuda.is_available() and torch.cuda.is_bf16_supported()
    dtype = DTYPE_MAP[_get(ai_raw, "DTYPE", AIConfig.DTYPE)]
    
    if dtype == torch.bfloat16 and not bf16_avail:
        print("torch.bfloat16 is not supported")
        dtype = torch.float16

    ai = AIConfig(
        FREE_MEM_THRESHOLD=int(_get(ai_raw, "FREE_MEM_THRESHOLD", AIConfig.FREE_MEM_THRESHOLD)),
        INFERENCE_MODE=str(_get(ai_raw, "INFERENCE_MODE", AIConfig.INFERENCE_MODE)),
        MODEL_NAME=str(_get(ai_raw, "MODEL_NAME", AIConfig.MODEL_NAME)),
        VLM_QUESTION=str(_get(ai_raw, "VLM_QUESTION", AIConfig.VLM_QUESTION)),
        VLM_PROMPT=str(_get(ai_raw, "VLM_PROMPT", AIConfig.VLM_PROMPT)),
        DEVICE_MAP=str(_get(ai_raw, "DEVICE_MAP", AIConfig.DEVICE_MAP)),
        MODEL_ID=MODEL_ID_MAP[str(_get(ai_raw, "MODEL_NAME", AIConfig.MODEL_NAME))],
        TASK_TYPE=str(_get(ai_raw, "TASK_TYPE", AIConfig.TASK_TYPE)),
        MAX_TOKENS=int(_get(ai_raw, "MAX_TOKENS", AIConfig.MAX_TOKENS)),
        DTYPE = dtype,
        NORM_MEAN=_get(ai_raw, "NORM_MEAN", AIConfig.NORM_MEAN),
        NORM_STD=_get(ai_raw, "NORM_STD", AIConfig.NORM_STD),
    )

    return Config(
        type=str(_get(config_data, "type", "develop")),
        FASTAPI=fastapi,
        HTTP=http,
        AI=ai,
    )
    
    
def _get(mapping: Dict[str, Any], key: str, default: Any = None) -> Any:
    if not isinstance(mapping, dict):
        return default

    if key in mapping:
        return mapping[key]

    kl = key.lower()
    for k, v in mapping.items():
        if isinstance(k, str) and k.lower() == kl:
            return v
    return default
    
    
def load_config(config_path: str) -> Config:
    raw = _get_config_file(config_path)
    return _parse_config(raw)

def to_yamlable(obj):
    if is_dataclass(obj):
        return {k: to_yamlable(v) for k, v in asdict(obj).items()}

    if isinstance(obj, dict):
        return {to_yamlable(k): to_yamlable(v) for k, v in obj.items()}

    if isinstance(obj, (list, tuple, set)):
        return [to_yamlable(x) for x in obj]

    if isinstance(obj, torch.dtype):
        return str(obj)  # "torch.float32"

    if isinstance(obj, np.ndarray):
        return obj.tolist()
    
    if isinstance(obj, (np.integer, np.floating, np.bool_)):
        return obj.item()

    if isinstance(obj, Path):
        return str(obj)

    if isinstance(obj, Enum):
        return obj.value
    return obj

def save_yaml(cfg, path: str):
    data = to_yamlable(cfg)
    with open(path, "w", encoding="utf-8") as f:
        yaml.safe_dump(
            data,
            f,
            sort_keys=False,
            allow_unicode=True,
            default_flow_style=False,
        )