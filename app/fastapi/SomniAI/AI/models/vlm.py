
from SomniAI.AI.registry import vlm_register
from typing import Optional
import torch
import torch.nn as nn
from typing import Dict
from PIL import Image

class VLMAdapter(nn.Module):
    def caption(self, image: Image.Image, prompt: Optional[str] = None, **gen_kw) -> str:
        raise NotImplementedError
    def vqa(self, image: Image.Image, question: str, **gen_kw) -> str:
        raise NotImplementedError
    def forward(self, image : Image.Image):
        raise NotImplementedError        

@vlm_register.register("BLIP") 
class BLIPCaptionAdapter(VLMAdapter):
    def __init__(
            self,
            model_id: str,
            prompt: str = "",
            question: Optional[str] = None,
            dtype: Optional[torch.dtype] = None,
            device_map: Optional[str] = None,
            default_max_new_tokens: int = 32,
        ):
        
        from transformers import BlipProcessor, BlipForConditionalGeneration
        
        self.default_max_new_tokens = default_max_new_tokens
        self.prompt = prompt
        self.question = question
        self.processor = BlipProcessor.from_pretrained(model_id)
        if device_map:
            self.model = BlipForConditionalGeneration.from_pretrained(model_id, device_map=device_map, torch_dtype=dtype)
        else:
            self.model = BlipForConditionalGeneration.from_pretrained(model_id, torch_dtype=dtype)
        
        self.model.to('cuda').eval()
        self.dtype = dtype

    def _gen(self, inputs: Dict[str, torch.Tensor], **gen_kw) -> torch.Tensor:

        if "max_new_tokens" not in gen_kw:
            gen_kw["max_new_tokens"] = self.default_max_new_tokens

        use_amp = (self.device is not None) and (self.device.type == "cuda") and (self.dtype == torch.float16)
        with torch.inference_mode():
            if use_amp:
                with torch.amp.autocast(dtype=torch.float16):
                    return self.model.generate(**inputs, **gen_kw)
            else:
                return self.model.generate(**inputs, **gen_kw)
            
    def caption(self, image: torch.Tensor, **gen_kw) -> str:
        inputs = self.processor(image, text=self.prompt, return_tensors="pt")
        if self.device and not gen_kw.get("device_map"):
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
        out = self._gen(inputs, **gen_kw)
        return self.processor.decode(out[0], skip_special_tokens=True)

    def vqa(self, image: torch.Tensor, **gen_kw) -> str:
        inputs = self.processor(image, self.question, return_tensors="pt")
        if not gen_kw.get("device_map"):
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
        out = self._gen(inputs, **gen_kw)
        return self.processor.decode(out[0], skip_special_tokens=True)
    
    def forward(self, image: torch.Tensor, **gen_kw) -> str:
        if self.question:
            return self.vqa(image, **gen_kw)
        return self.caption(image, **gen_kw)
    
    
    
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