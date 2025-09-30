
from typing import Callable, Dict

import torch
import torch.nn as nn


class Inference:
    
    def __init__(self, prompt : str = None, question : str = None, logger : Callable = None):
        
        self.prompt = prompt
        self.question = question
        
        self.logger = logger
        
        self._vision_model = None
        self._vlm_model = None
        
    def set_vision_model(self, model):
        self._vision_model = model
        
    def set_vlm_model(self, model):
        self._vlm_model = model
        
    def run_in_vision(self, img) -> Dict:
        
        try:
            result, keypoints, scores, bboxes = self._vision_model.predict(img)
        except Exception as e:
            self.logger(f"[Error] Error occured while inferencing image : {e}")
        
        return {"result" : result, "keypoints" : keypoints, "scores" : scores, "bboxes" : bboxes}

    def run_in_vlm(self, img) -> Dict:
        
        try:
            ans = self._vlm_model(img)
        except Exception as e:
            self.logger(f"[Error] VLM inference failed: {e}")
            
        return {"ans" : ans}

    def _run_inference_llm(self, model, img, gpu_id):
        ...
    
    
