
import time
from abc import abstractmethod
from datetime import datetime
from typing import Callable, Dict

import torch
import torch.nn as nn
from PIL import Image


class IInference(nn.Module):
    '''
    SomniAI 서버의 AI 추론을 담당합니다. 모델 추론의 결과를 책임지는 클래스로 AI 추론의
    파이프라인을 담당해요. 어떤 모델을 사용할지는 몰라요. 입력과 출력만 알고 있는 구조에요.
    
    모델을 넘겨받을 때는 모델의 메타 정보가 포함되어 있어야 해요. 모델이 어떤 이미지 사이즈를 가지고
    추론하는지, 어떤 데이터 타입 형식이어야 하는지 알 수 있어야 해요.
    
    '''
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.model_loader = None
    
    @abstractmethod
    def _pose_infer(self, img: Image.Image) -> str:
        '''
        HRNet 모델을 이용하여 좌표를 계산 합니다.
        '''
        
        raise NotImplementedError
        
    @abstractmethod
    def _vlm_infer(self, pred: str) -> dict:
        '''
        VLM을 이용하여 추론합니다.
        '''
        
        raise NotImplementedError
    
    def forward(self, img : Image.Image):
        
        start = time.time()
        pose_output = self._pose_infer(img)
        vlm_output = self._vlm_infer(img)
        
        return {
            "pose_output" : pose_output,
            "vlm_output" : vlm_output["result"],
            "model_info": {
                "vision_model": self.model_loader.get_pose_name(),
                "llm_model": self.model_loader.get_vlm_name(),
            },
            "inference_meta": {
                "timestamp": datetime.now(),
                "duration_sec": time.time() - start,
                "device": "cuda:0"
            },
        }
    
    
class InferenceGPU(IInference):
    
    _instance = None
    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            raise RuntimeError("AEYE_Inference is not initialized yet")
        return cls._instance
    
    def __init__(self, model_loader, cfg):
        
        super().__init__()
        self.cfg = cfg
        
        self.model_loader = model_loader
        
        self.pose_model = self.model_loader.get_pose()
        self.vlm_model  = self.model_loader.get_vlm()
                
        self.prompt = cfg.AI.VLM.PROMPT
        self.question = cfg.AI.VLM.QUESTION
                
        self._vision_model = None
        self._vlm_model = None
    
    
    def _pose_infer(self, img : Image.Image) -> str:
        
        if not isinstance(img, Image.Image):
            raise ValueError("Wrong image type is inserted to Inference GPU")
        
        result, keypoints, scores, bboxes = self.pose_model.predict(img)
            
        return result, keypoints, scores, bboxes
    
    def _vlm_infer(self, img : Image.Image):
        result = self.vlm_model(img)
    
        return {
            "result" : result,
        }