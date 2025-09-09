
from SomniAI.AI.registry import vlm_register
from typing import Optional, List
import torch
import torch.nn as nn
from typing import Dict
from PIL import Image
import numpy as np

class VLMAdapter(nn.Module):
    def caption(self, image: Image.Image, prompt: Optional[str] = None, **gen_kw) -> str:
        raise NotImplementedError
    def vqa(self, image: Image.Image, question: str, **gen_kw) -> str:
        raise NotImplementedError
    def forward(self, image ):
        raise NotImplementedError        

def tensor_to_pil(img: torch.Tensor) -> Image.Image:
    """
    허용 입력:
      - (H,W)        -> gray
      - (C,H,W)      -> C=1/3/4
      - (H,W,C)      -> C=1/3/4
    dtype:
      - float: [-1,1] 또는 [0,1] 또는 [0,255]
      - int/uint: 자동 보정
    """
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


@vlm_register.register("BLIP") 
class BLIPCaptionAdapter(VLMAdapter):
    def __init__(
            self,
            cfg,
            device
        ):
        super().__init__()
        from transformers import BlipProcessor, BlipForConditionalGeneration
        
        self.cfg = cfg
        self.model_id = self.cfg.MODEL_ID
        self.default_max_new_tokens = int(self.cfg.MAX_NEW_TOKENS)
        print("$$$")
        print(self.default_max_new_tokens)
        self.prompt = self.cfg.VLM_PROMPT
        self.question = self.cfg.VLM_QUESTION
        self.dtype = cfg.DTYPE
        self.processor = BlipProcessor.from_pretrained(self.cfg.MODEL_ID)
        self.device = torch.device(device) if not isinstance(device, torch.device) else device
        self.device_map = self.cfg.DEVICE_MAP
        self.task = self.cfg.TASK_TYPE
        
        if self.device_map:
            self.model = BlipForConditionalGeneration.from_pretrained(self.model_id, device_map=self.device_map, torch_dtype=self.dtype)
        else:
            self.model = BlipForConditionalGeneration.from_pretrained(self.model_id, torch_dtype=self.dtype)
            self.model.to(self.device)

        self.model.eval()
        
        if self.task.upper() == "VQA":
            self.inference = self.vqa
        elif self.task.upper() == "CAPTION":
            self.inference = self.caption
        else:
            raise ValueError("Invalid task")

    def _gen(self, inputs: Dict[str, torch.Tensor], **gen_kw) -> torch.Tensor:

        if "max_new_tokens" not in gen_kw:
            gen_kw["max_new_tokens"] = self.default_max_new_tokens

        use_amp = (self.device is not None) and (self.device.type == "cuda") and (self.dtype == torch.float16)
        with torch.inference_mode():
            if use_amp:
                with torch.amp.autocast(device_type="cuda", dtype=torch.float16):
                    return self.model.generate(**inputs, **gen_kw)
            else:
                return self.model.generate(**inputs, **gen_kw)
            
    def caption(self, image: Image.Image, **gen_kw) -> str:
        inputs = self.processor(image, text=self.prompt, return_tensors="pt")
        if self.device and not gen_kw.get("device_map"):
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
        out = self._gen(inputs, **gen_kw)
        result = self.processor.decode(out[0], skip_special_tokens=True)
        print(result)
        return result

    def vqa(self, image: Image.Image, **gen_kw) -> str:
        inputs = self.processor(image, self.question, return_tensors="pt")
        if not gen_kw.get("device_map"):
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
        out = self._gen(inputs, **gen_kw)
        result = self.processor.decode(out[0], skip_special_tokens=True)
        print (result)
        
        return result
    
    def forward(self, image: Image.Image, **gen_kw) -> str:
        return self.inference(image, **gen_kw)
    
    
@vlm_register.register("BLIP2")
class BLIP2Adapter(VLMAdapter):
    def __init__(self, model_id: str, device: str = None, dtype: Optional[torch.dtype] = None, device_map: Optional[str] = None):
        from transformers import Blip2Processor, Blip2ForConditionalGeneration
        self.processor = Blip2Processor.from_pretrained(model_id)
        if device_map:
            self.model = Blip2ForConditionalGeneration.from_pretrained(model_id, device_map=device_map, torch_dtype=dtype)
        else:
            self.model = Blip2ForConditionalGeneration.from_pretrained(model_id, torch_dtype=dtype)
            if device:
                self.model.to(device)
        self.device = device
        self.dtype = dtype

    def _gen(self, image: Image.Image, text: Optional[str], **gen_kw) -> str:
        inputs = self.processor(images=image, text=text, return_tensors="pt")
        if self.device and not gen_kw.get("device_map"):
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
        out = self.model.generate(**({"max_new_tokens": 64} | gen_kw), **inputs)
        return self.processor.tokenizer.decode(out[0], skip_special_tokens=True)

    def caption(self, image: Image.Image, prompt: Optional[str] = None, **gen_kw) -> str:
        # BLIP-2는 보통 프롬프트와 함께 캡셔닝 품질이 좋아짐
        text = prompt or "A photo of"
        return self._gen(image, text, **gen_kw)

    def vqa(self, image: Image.Image, question: str, **gen_kw) -> str:
        return self._gen(image, question, **gen_kw)
    
    def forward(self, image):
        ...
        
@vlm_register.register("GIT")
class GITCaptionAdapter(VLMAdapter):
    def __init__(self, model_id: str, device: str = None, dtype: Optional[torch.dtype] = None, device_map: Optional[str] = None):
        from transformers import AutoProcessor, AutoModelForCausalLM
        self.processor = AutoProcessor.from_pretrained(model_id)
        if device_map:
            self.model = AutoModelForCausalLM.from_pretrained(model_id, device_map=device_map, torch_dtype=dtype)
        else:
            self.model = AutoModelForCausalLM.from_pretrained(model_id, torch_dtype=dtype)
            if device:
                self.model.to(device)
        self.device = device
        self.dtype = dtype

    def caption(self, image: Image.Image, prompt: Optional[str] = None, **gen_kw) -> str:
        text = prompt or ""
        inputs = self.processor(images=image, text=text, return_tensors="pt")
        if self.device and not gen_kw.get("device_map"):
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
        out = self.model.generate(**inputs, **({"max_new_tokens": 32} | gen_kw))
        return self.processor.batch_decode(out, skip_special_tokens=True)[0].strip()

    def vqa(self, image: Image.Image, question: str, **gen_kw) -> str:
        inputs = self.processor(images=image, text=question, return_tensors="pt")
        if self.device and not gen_kw.get("device_map"):
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
        out = self.model.generate(**inputs, **({"max_new_tokens": 32} | gen_kw))
        return self.processor.batch_decode(out, skip_special_tokens=True)[0].strip()

    def forward(self, image):
        ...

@vlm_register.register("Llava")
class Llava15Adapter(VLMAdapter):
    def __init__(self, model_id: str, device: str = None, dtype: Optional[torch.dtype] = None, device_map: Optional[str] = None):
        # 최근 transformers는 llava-hf 가 들어와 있어서 신버전 필요
        # ex) "llava-hf/llava-1.5-7b-hf" 또는 "liuhaotian/llava-v1.5-7b" (후자는 trust_remote_code 필요할 수 있음)
        from transformers import AutoProcessor, AutoModelForCausalLM
        self.processor = AutoProcessor.from_pretrained(model_id, trust_remote_code=True)
        if device_map:
            self.model = AutoModelForCausalLM.from_pretrained(model_id, device_map=device_map, torch_dtype=dtype, trust_remote_code=True)
        else:
            self.model = AutoModelForCausalLM.from_pretrained(model_id, torch_dtype=dtype, trust_remote_code=True)
            if device:
                self.model.to(device)
        self.device = device
        self.dtype = dtype

    def _run(self, image: Image.Image, prompt: str, **gen_kw) -> str:
        proc = self.processor
        # LLaVA는 대화형 프롬프트 포맷을 모델별로 다르게 요구할 수 있음(여기서는 간단 버전)
        inputs = proc(images=image, text=prompt, return_tensors="pt")
        if self.device and not gen_kw.get("device_map"):
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
        out = self.model.generate(**inputs, **({"max_new_tokens": 128} | gen_kw))
        return proc.batch_decode(out, skip_special_tokens=True)[0].strip()

    def caption(self, image: Image.Image, prompt: Optional[str] = None, **gen_kw) -> str:
        p = prompt or "Describe the image in detail."
        return self._run(image, p, **gen_kw)

    def vqa(self, image: Image.Image, question: str, **gen_kw) -> str:
        return self._run(image, f"USER: {question}\nASSISTANT:", **gen_kw)
    
    def forward(self, image):
        ...