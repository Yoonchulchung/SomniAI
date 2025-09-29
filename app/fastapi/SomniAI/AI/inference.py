
from typing import Callable

import torch
import torch.nn as nn


class Inference:
    
    def __init__(self, prompt : str = None, question : str = None, logger : Callable = None):
        
        self.prompt = prompt
        self.question = question
        
        self.logger = logger
        
        self.model = None
        
    def set_model(self, model):
        self.model = model
        
    def run_in_vision(self, img):
        
        try:
            pred = self.model.predict(img)
        except Exception as e:
            self.logger(f"[Error] Error occured while inferencing image : {e}")
        return pred

    def run_in_vlm(self, img):
        
        try:
            ans = self.model(img)
        except Exception as e:
            self.logger(f"[Error] VLM inference failed: {e}")
            
        return ans

    def _run_inference_llm(self, model, img, gpu_id):
        ...
    
    
