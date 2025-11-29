import os
from functools import lru_cache
from typing import List, Optional, Any, Dict, Union

import torch
import yaml
from pydantic import BaseModel, Field, model_validator, ConfigDict
from pydantic_settings import BaseSettings, SettingsConfigDict
from dataclasses import asdict, dataclass, field, is_dataclass
import numpy as np
from enum import Enum
from pydantic import BaseModel

from pathlib import Path


import ast  # <--- 상단에 import 추가
from pydantic import field_validator


# --- Constants & Maps ---
DTYPE_MAP = {
    "float32": torch.float32,
    "float16": torch.float16,
    "bfloat16": torch.bfloat16
}

VLM_MODEL_ID_MAP = {
    "BLIP": "Salesforce/blip-image-captioning-base",
    "BLIP2": "Salesforce/blip2-opt-2.7b",
    "GIT": "microsoft/git-large-coco",
    "Llava": "llava-hf/llava-1.5-7b-hf",
    "Qwen2VL": "Qwen/Qwen2-VL-7B-Instruct",
    "Qwen3GG": "Qwen/Qwen3Guard-Gen-4B",
}

POSE_MODEL_ID_MAP = {
    "YOLO": "yolo11x-pose.pt",
    "MMPose": "https://download.openmmlab.com/mmpose/top_down/hrnet/hrnet_w48_coco_wholebody_384x288_dark-f5726563_20200918.pth",
}


# --- Sub-Configurations (Pydantic Models) ---

class MQTTConfig(BaseModel):
    """MQTT 설정"""
    ADDRESS: str = "localhost"
    PORT: int = 1883
    TOPIC: str = "somniai/neck/angle"


class FastAPIConfig(BaseModel):
    """FastAPI 설정"""
    HOST: str = "localhost"
    PORT: int = 8000
    API_PREFIX: str = "/api/v1"
    VIEW_PREFIX: str = "/view/fastapi"
    WORKERS: int = 1
    RELOAD: bool = True
    LOG_LEVEL: str = "info"


class HTTPConfig(BaseModel):
    """HTTP/Batch 설정"""
    BATCH_THRESHOLD: int = 256
    BATCH_TIMEOUT: float = 1.0
    PUBLIC_IP: str = "http://192.168.0.1/"


class VLMConfig(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    MODEL_NAME: Optional[str] = None
    MODEL_ID: Optional[str] = None
    DEVICE: Optional[str] = None
    DEVICE_MAP: Optional[str] = None
    DTYPE: Any = torch.float32
    TASK_TYPE: Optional[str] = None
    MAX_TOKENS: Optional[int] = None
    QUESTION: Optional[str] = None
    PROMPT: Optional[str] = None

    @model_validator(mode='before')
    @classmethod
    def process_config(cls, data: Any) -> Any:
        if isinstance(data, dict):
            
            # DTYPE 처리 (String -> torch.dtype)
            dtype_str = data.get("DTYPE", "float32")
            
            if not isinstance(dtype_str, torch.dtype):
                dtype = DTYPE_MAP.get(str(dtype_str), torch.float32)
                
                # BF16 지원 여부 확인
                bf16_avail = torch.cuda.is_available() and torch.cuda.is_bf16_supported()
                if dtype == torch.bfloat16 and not bf16_avail:
                    print("Warning: torch.bfloat16 is not supported on this device. Fallback to float16.")
                    dtype = torch.float16
                data["DTYPE"] = dtype

            # MODEL_ID 매핑
            model_name = data.get("MODEL_NAME")
            if model_name and not data.get("MODEL_ID"):
                data["MODEL_ID"] = VLM_MODEL_ID_MAP.get(model_name)
        
        return data


class POSEConfig(BaseModel):
    """Pose Estimation Model 설정"""
    model_config = ConfigDict(arbitrary_types_allowed=True)

    MODEL_NAME: Optional[str] = None
    MODEL_ID: Optional[str] = None
    MODEL_CFG_PATH: Optional[str] = None
    DEVICE: Optional[str] = None
    DTYPE: Any = torch.float32
    CHECKPOINT: Optional[str] = None
    CONF_THRES: Optional[float] = None
    IOU_THRES: Optional[float] = None

    @model_validator(mode='before')
    @classmethod
    def process_config(cls, data: Any) -> Any:
        if isinstance(data, dict):

            # DTYPE 처리
            dtype_str = data.get("DTYPE", "float32")
            if not isinstance(dtype_str, torch.dtype):
                dtype = DTYPE_MAP.get(str(dtype_str), torch.float32)
                
                bf16_avail = torch.cuda.is_available() and torch.cuda.is_bf16_supported()
                if dtype == torch.bfloat16 and not bf16_avail:
                    print("Warning: torch.bfloat16 is not supported. Fallback to float16.")
                    dtype = torch.float16
                data["DTYPE"] = dtype

            # MODEL_ID 매핑
            model_name = data.get("MODEL_NAME")
            if model_name and not data.get("MODEL_ID"):
                data["MODEL_ID"] = POSE_MODEL_ID_MAP.get(model_name)
                
        return data


class AIConfig(BaseModel):
    FREE_MEM_THRESHOLD: int = 2
    NORM_MEAN: tuple = (0.485, 0.456, 0.406)
    NORM_STD: tuple = (0.229, 0.224, 0.225)

    VLM: VLMConfig = Field(default_factory=VLMConfig)
    POSE: POSEConfig = Field(default_factory=POSEConfig)

    @field_validator("NORM_MEAN", "NORM_STD", mode="before")
    @classmethod
    def parse_tuple_from_string(cls, v):
        if isinstance(v, str):
            try:
                return tuple(ast.literal_eval(v))
            except (ValueError, SyntaxError):
                pass 
        return v


# --- Main Settings Class ---

class Settings(BaseSettings):
    """애플리케이션 통합 설정 (BaseSettings 상속)"""

    # 1. Basic Application Info
    APP_NAME: str = "SomniAI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    TYPE: str = "develop"

    # 2. Database (기존 설정 유지)
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_USER: str = "root"
    DB_PASSWORD: str = "local-root-pass"
    DB_NAME: str = "somniai"
    DB_ECHO: bool = False

    # 3. Security (기존 설정 유지)
    JWT_SECRET_KEY: str = "your-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # 4. CORS (기존 설정 유지)
    CORS_ORIGINS: List[str] = ["*"]
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: List[str] = ["*"]
    CORS_ALLOW_HEADERS: List[str] = ["*"]

    # 5. Nested Configurations (새로운 구조 통합)
    FASTAPI: FastAPIConfig = Field(default_factory=FastAPIConfig)
    HTTP: HTTPConfig = Field(default_factory=HTTPConfig)
    AI: AIConfig = Field(default_factory=AIConfig)
    MQTT: MQTTConfig = Field(default_factory=MQTTConfig)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
        arbitrary_types_allowed=True
    )

    @property
    def database_url(self) -> str:
        return f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
    
    @classmethod
    def from_yaml(cls, path: str) -> "Settings":
        if not os.path.exists(path):
            raise FileNotFoundError(f"{path} not found")
            
        with open(path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
            
        if not isinstance(data, dict):
            raise ValueError("YAML root must be a mapping (dict).")
            
        return cls(**data)


@lru_cache
def get_settings() -> Settings:

    return Settings()

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

def to_yamlable(obj):
    
    if isinstance(obj, BaseModel):
        return {k: to_yamlable(v) for k, v in obj.model_dump().items()}
    
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