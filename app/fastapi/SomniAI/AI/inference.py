
from typing import Callable

import torch
import torch.nn as nn


class Inference(nn.Module):
    
    def __init__(self, prompt : str = None, question : str = None, logger : Callable = None):
        super().__init__()
        self.prompt = prompt
        self.question = question
        
        self.logger = logger
        
        self.model = None
        
    def set_model(self, model):
        self.model = model
        
    def _run_inference_vision(self, img):
        
        try:
            pred = self.model.predict(img)
        except Exception as e:
            self.logger(f"[Error] Error occured while inferencing image : {e}")
        return pred

    def _run_inference_vlm(self, img):
        
        try:
            ans = self.model(img)
        except Exception as e:
            self.logger(f"[Error] VLM inference failed: {e}")
            
        return ans

    def _run_inference_llm(self, model, img, gpu_id):
        ...
    
    def forward(self, img):
        return self._run_inference_vlm(img)
    
    
    
