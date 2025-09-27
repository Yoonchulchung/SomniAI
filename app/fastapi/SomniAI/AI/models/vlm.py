
from typing import List

import numpy as np
import torch
import torch.nn as nn
from PIL import Image

from SomniAI.AI.registry import vlm_register


class VLMAdapter(nn.Module):
    def __init__(self, cfg):
        super().__init__()
        
        self.cfg = cfg
        self.processor = None
        self.model = None
        self._build()
        self.model.eval()
            
        self.gen_kw = {}
        self.gen_kw["max_new_tokens"] = self.cfg.MAX_TOKENS
    
        if self.cfg.TASK_TYPE.upper() == "VQA":
            self.inference = self.vqa
        elif self.cfg.TASK_TYPE.upper() == "CAPTION":
            self.inference = self.caption
        else:
            raise ValueError("Invalid task")
        
    def _build(self):
        raise NotImplementedError
    def _gen(self, image : Image.Image, text : str) -> str:
        raise NotImplementedError
    def caption(self, image: Image.Image) -> str:
        return self._gen(image, self.cfg.VLM_PROMPT)

    def vqa(self, image: Image.Image) -> str:
        return self._gen(image, self.cfg.VLM_QUESTION)
    
    def forward(self, image: Image.Image) -> str:
        return self.inference(image)
    
    
@vlm_register.register("BLIP") 
class BLIPCaptionAdapter(VLMAdapter):
    def __init__(self, cfg):
        super().__init__(cfg)
    
    def _build(self):
        from transformers import BlipForConditionalGeneration, BlipProcessor
        self.processor = BlipProcessor.from_pretrained(self.cfg.MODEL_ID, use_fast=True)

        if self.cfg.DEVICE_MAP:
            self.model = BlipForConditionalGeneration.from_pretrained(
                self.cfg.MODEL_ID, 
                device_map=self.cfg.DEVICE_MAP, 
                torch_dtype=self.cfg.DTYPE,
                offload_folder="./offload",
                #load_in_4bit=True,
            )
        else:
            self.model = BlipForConditionalGeneration.from_pretrained(
                self.cfg.MODEL_ID, 
                torch_dtype=self.cfg.DTYPE)
            self.model.to("cuda")
    
    def _gen(self, image : Image.Image, text : str) -> str:
        inputs = self.processor(image, text=text, return_tensors="pt")
        if not self.cfg.DEVICE_MAP:
            inputs = {k: v.to("cuda") for k, v in inputs.items()}
        
        with torch.inference_mode():
            with torch.amp.autocast(device_type="cuda", dtype=self.cfg.DTYPE):
                return self.model.generate(**inputs, **self.gen_kw)
    
    
@vlm_register.register("BLIP2")
class BLIP2Adapter(VLMAdapter):
    
    def __init__(self, cfg):
        super().__init__(cfg)
        
    def _build(self):
        from transformers import Blip2ForConditionalGeneration, Blip2Processor
        self.processor = Blip2Processor.from_pretrained(self.cfg.MODEL_ID, use_fast=True)
        
        if self.cfg.DEVICE_MAP:
            self.model = Blip2ForConditionalGeneration.from_pretrained(
                self.cfg.MODEL_ID, 
                torch_dtype=self.cfg.DTYPE,
                device_map={
                    "vision_model": 0,
                    "qformer": 0,
                    "language_model": 0,
                    "language_model.lm_head": 0,
                    "language_projection": 0,
                    "query_tokens" : 0
                })
        else:
            self.model = Blip2ForConditionalGeneration.from_pretrained(
                self.cfg.MODEL_ID, 
                torch_dtype=self.cfg.DTYPE)
            self.model.to("cuda")
            
    def _gen(self, image : Image.Image, text : str) -> str:
        inputs = self.processor(image, text=text, return_tensors="pt")
        inputs = {k: v.to(self.model.device) for k, v in inputs.items()}
        
        with torch.no_grad():
            generated_ids = self.model.generate(**inputs, max_new_tokens=64)
        return self.processor.decode(generated_ids[0], skip_special_tokens=True)
    
        
@vlm_register.register("GIT")
class GITCaptionAdapter(VLMAdapter):
    
    def __init__(self, cfg):
        super().__init__(cfg)
        
    def _build(self, ):
        from transformers import AutoModelForCausalLM, AutoProcessor
        self.processor = AutoProcessor.from_pretrained(self.cfg.MODEL_ID, use_fast=True)
        
        self.model = AutoModelForCausalLM.from_pretrained(
            self.cfg.MODEL_ID, 
            torch_dtype=self.cfg.DTYPE)
        self.model.to("cuda")

    def _gen(self, image : Image.Image, text : str) -> str:
        inputs = self.processor(image, text=text, return_tensors="pt")
        inputs = {k: v.to(self.model.device) for k, v in inputs.items()}
        
        with torch.no_grad():
            generated_ids = self.model.generate(**inputs, max_new_tokens=64)
        return self.processor.decode(generated_ids[0], skip_special_tokens=True)


@vlm_register.register("Llava")
class Llava15Adapter(VLMAdapter):
    
    def __init__(self, cfg):
        super().__init__(cfg)
    
    def _build(self):
        from transformers import AutoProcessor, LlavaForConditionalGeneration
        self.processor = AutoProcessor.from_pretrained(self.cfg.MODEL_ID, trust_remote_code=True, use_fast=True)
    
        self.model = LlavaForConditionalGeneration.from_pretrained(
            self.cfg.MODEL_ID,
            torch_dtype=self.cfg.DTYPE,
            device_map="cuda:0",       
            trust_remote_code=True,
        )
    

    def _gen(self, image : Image.Image, text : str) -> str:
        inputs = self.processor(image, text=text, return_tensors="pt")
        inputs = {k: v.to(self.model.device) for k, v in inputs.items()}
        
        with torch.no_grad():
            generated_ids = self.model.generate(**inputs, max_new_tokens=64)
        return self.processor.decode(generated_ids[0], skip_special_tokens=True)
    
        


def tensor_to_pil(img: torch.Tensor) -> Image.Image:

    t = img.detach().cpu()

    # (B,C,H,W) or (B,H,W,C) -> 배치 차원 제거 (B==1 가정)
    if t.ndim == 4:
        if t.shape[0] != 1:
            raise ValueError(f"Batch size>1: {tuple(t.shape)}. 먼저 배치로 iterate 하세요.")
        t = t.squeeze(0)  # (C,H,W) or (H,W,C)

    # (C,H,W) -> (H,W,C)
    if t.ndim == 3 and t.shape[0] in (1, 3, 4):
        t = t.permute(1, 2, 0)

    # (H,W) 그대로 가능, (H,W,C) 가능
    if t.ndim == 2:
        pass
    elif t.ndim == 3:
        if t.shape[2] not in (1, 3, 4):
            raise ValueError(f"Unsupported channel count: {t.shape[2]}")
    else:
        raise ValueError(f"Unsupported tensor shape: {tuple(t.shape)}")

    # dtype/범위 보정
    if t.dtype.is_floating_point:
        t = t.to(torch.float32)
        mn, mx = float(t.min()), float(t.max())
        if mn < 0.0:              # [-1,1] -> [0,1]
            t = (t + 1.0) / 2.0
        if float(t.max()) > 1.0:  # [0,255] float -> [0,1]
            t = t / 255.0
        t = (t.clamp(0, 1) * 255.0).round().to(torch.uint8)
    else:
        if t.dtype != torch.uint8:
            # 값 범위 추정 후 0~255로 매핑
            t = t.to(torch.int32)
            mn, mx = int(t.min()), int(t.max())
            if 0 <= mn and mx <= 255:
                t = t.to(torch.uint8)
            else:
                t = (t - mn).to(torch.float32) / max(1, (mx - mn))
                t = (t.clamp(0, 1) * 255.0).round().to(torch.uint8)

    arr = t.numpy()
    if arr.ndim == 3 and arr.shape[2] == 1:
        arr = np.squeeze(arr, axis=2)  # (H,W)

    return Image.fromarray(arr)

def batch_tensor_to_pils(batch: torch.Tensor) -> List[Image.Image]:
    """
    (B,C,H,W) or (B,H,W,C) -> [PIL.Image] (B개)
    """
    if batch.ndim != 4:
        raise ValueError(f"Expected 4D batch, got {tuple(batch.shape)}")
    return [tensor_to_pil(batch[i]) for i in range(batch.shape[0])]
