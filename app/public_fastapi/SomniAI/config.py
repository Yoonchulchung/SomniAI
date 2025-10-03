import importlib
import os
import types
from dataclasses import asdict, dataclass, field, is_dataclass
from enum import Enum
from pathlib import Path
from typing import Any, Dict, Union

import numpy as np
import yaml


@dataclass
class FastAPIConfig:
    HOST: str = "localhost"
    PORT: int = 8000
    API_PREFIX: str = "/fastapi"
    WORKERS: int = 1
    RELOAD : bool = False
    LOG_LEVEL : str = "info"


@dataclass
class Config:
    type: str = "develop"
    FASTAPI: FastAPIConfig = field(default_factory=FastAPIConfig)
    
    
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
            }
            
    if not isinstance(config_data, dict):
        raise TypeError("config_data must be dict/module/Config")
    
    
    fastapi_raw = _get(config_data, "FASTAPI", {}) or {}
    

    fastapi = FastAPIConfig(
        HOST=_get(fastapi_raw, "HOST", FastAPIConfig.HOST),
        PORT=int(_get(fastapi_raw, "PORT", FastAPIConfig.PORT)),
        API_PREFIX=_get(fastapi_raw, "API_PREFIX", FastAPIConfig.API_PREFIX),
        WORKERS=int(_get(fastapi_raw, "WORKERS", FastAPIConfig.WORKERS)),
        RELOAD=_get(fastapi_raw, "RELOAD", FastAPIConfig.RELOAD),
        LOG_LEVEL=_get(fastapi_raw, "LOG_LEVEL", FastAPIConfig.LOG_LEVEL),
    )

    return Config(
        type=str(_get(config_data, "type", "develop")),
        FASTAPI=fastapi,
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