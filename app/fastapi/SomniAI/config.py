import yaml
import os
import importlib
from dataclasses import dataclass, field
from typing import Union, Dict, Any
import types

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
    INFERENCE_MODE: str = "vlm"
    MODEL_NAME: str = "BLIP2"   
    VLM_QUESTION : str = ...
    VLM_PROMPOT : str = ...

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

    ai = AIConfig(
        FREE_MEM_THRESHOLD=int(_get(ai_raw, "FREE_MEM_THRESHOLD", AIConfig.FREE_MEM_THRESHOLD)),
        INFERENCE_MODE=str(_get(ai_raw, "INFERENCE_MODE", AIConfig.INFERENCE_MODE)),
        MODEL_NAME=str(_get(ai_raw, "MODEL_NAME", AIConfig.MODEL_NAME)),
        VLM_PROMPOT=str(_get(ai_raw, "VLM_PROMPOT", AIConfig.VLM_PROMPOT)),
        VLM_QUESTION=str(_get(ai_raw, "VLM_QUESTION", AIConfig.VLM_QUESTION)),
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