
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
        cls_output = self._pose_infer(img)
        llm_output = self._vlm_infer(cls_output)
        
        return {
            "cls_output" : cls_output,
            "llm_output" : llm_output["result"],
            "diagnosis_summary": llm_output["diagnosis_summary"],
            "model_info": {
            "vision_model": self.model_loader.get_vision_name(),
            "llm_model": self.model_loader.get_llm_name(),
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
    
    
    def _pose_infer(self, img : torch.Tensor) -> str:
        
        if not isinstance(img, torch.Tensor):
            raise ValueError("Wrong image type is inserted to Inference GPU")
        
        with torch.no_grad():
            pred = self.pose_model(img)
            probs = torch.softmax(pred, dim=1)          
            top_prob, top_idx = probs.max(dim=1)
            pred_label = self.labels[top_idx.item()]
            
        return pred_label
    
    def _vlm_infer(self, pred):
        result = self.langchain_search.search(f"{pred}의 진료 방법은 뭐야.")
        llm_summary = self.langchain_search.search(f"{result}를 30자 이하로 요약해봐")
        
        return {
            "result" : result,
            "diagnosis_summary" : llm_summary,
        }