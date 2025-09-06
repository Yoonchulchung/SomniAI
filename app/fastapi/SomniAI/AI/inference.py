
import torch
import torch.nn as nn
from typing import Optional, Callable


class Inference(nn.Module):
    
    def __init__(self, prompt : str = None, question : str = None, logger : Callable = None):
        self.prompt = prompt
        self.question = question
        
        self.logger = logger
        
    def _run_inference_vision(self, model, batch, gpu_id):
        
        if not isinstance(batch, torch.Tensor):
            raise TypeError("Batch must be a torch.Tensor. Please convert before inference.")
        
        if not batch.is_cuda:
            raise ValueError("Batch is not on GPU. Please call .to('cuda') before inference.")
        
        try:
            with torch.no_grad():
                predictions = model[gpu_id](batch, verbose=False)
        except Exception as e:
            self.logger(f"[Error] Error occured while inferencing image : {e}")
        return predictions

    def _run_inference_vlm(self, model, img, gpu_id):

        if not img.is_cuda:
            raise ValueError("Batch is not on GPU. Please call .to('cuda') before inference.")
        
        try:
            with torch.no_grad():
                ans = model.vqa(img, self.prompt)
                cap = model.caption(img, self.question)
        except Exception as e:
            self.logger(f"[Error] VLM inference failed: {e}")
            
        return {"answer": ans, "caption": cap}

    def _run_inference_llm(self, model, img, gpu_id):
        ...
    
    def forward(self, img):
        ...
    
    
    
