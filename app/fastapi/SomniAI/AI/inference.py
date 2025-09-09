
import torch
import torch.nn as nn
from typing import Optional, Callable


class Inference(nn.Module):
    
    def __init__(self, prompt : str = None, question : str = None, logger : Callable = None):
        super().__init__()
        self.prompt = prompt
        self.question = question
        
        self.logger = logger
        
        self.model = ""
        
    def set_model(self, model):
        self.model = model
        
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

    def _run_inference_vlm(self, img):

        # if not img.is_cuda:
        #     raise ValueError("Batch is not on GPU. Please call .to('cuda') before inference.")
        
        try:
            with torch.no_grad():
                ans = self.model(img)
        except Exception as e:
            self.logger(f"[Error] VLM inference failed: {e}")
            
        return {"answer": ans}

    def _run_inference_llm(self, model, img, gpu_id):
        ...
    
    def forward(self, img):
        return self._run_inference_vlm(img)
    
    
    
