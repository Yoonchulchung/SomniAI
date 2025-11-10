
import re

import torch
import torch.nn as nn
from PIL import Image
from transformers import GenerationConfig

from SomniAI.application.AI.registry import vlm_register


class VLMAdapter(nn.Module):
    def __init__(self, cfg):
        super().__init__()
        
        self.cfg = cfg
        self.processor = None
        self.model = None
        self.tokenizer = None
        self._build()
        self.model.eval()
            
        self.gen_kw = {}
        self.gen_kw["max_new_tokens"] = self.cfg.AI.VLM.MAX_TOKENS
    
        if self.cfg.AI.VLM.TASK_TYPE.upper() == "VQA":
            self.inference = self.vqa
        elif self.cfg.AI.VLM.TASK_TYPE.upper() == "CAPTION":
            self.inference = self.caption
        else:
            raise ValueError("Invalid task")
        
        self.gen_config = GenerationConfig.from_model_config(self.model.config)
        self.gen_config.do_sample = False
        self.gen_config.temperature = None
        self.gen_config.top_p = None
        self.gen_config.top_k = None

        self.labels = [
            "left",
            "None",
            "Right",
            "Front",
        ]
        
        
    def _build(self):
        raise NotImplementedError
    
    @torch.inference_mode()
    def _gen(self, image : Image.Image, text : str) -> str:
        raise NotImplementedError
    
    def caption(self, image: Image.Image) -> str:
        return self._gen(image, self.cfg.AI.VLM.PROMPT)

    def vqa(self, image: Image.Image) -> str:
        return self._gen(image, self.cfg.AI.VLM.QUESTION)
    
    def forward(self, image: Image.Image) -> str:
        return self.inference(image)
    
    
@vlm_register.register("BLIP") 
class BLIPCaptionAdapter(VLMAdapter):
    def __init__(self, cfg):
        super().__init__(cfg)
    
    def _build(self):
        from transformers import BlipForConditionalGeneration, BlipProcessor
        self.processor = BlipProcessor.from_pretrained(self.cfg.MODEL_ID, use_fast=True)

        if self.cfg.AI.VLM.DEVICE_MAP:
            self.model = BlipForConditionalGeneration.from_pretrained(
                self.cfg.AI.VLM.MODEL_ID, 
                device_map=self.cfg.AI.VLM.DEVICE_MAP, 
                torch_dtype=self.cfg.DTYPE,
                offload_folder="./offload",
                #load_in_4bit=True,
            )
        else:
            self.model = BlipForConditionalGeneration.from_pretrained(
                self.cfg.AI.VLM.MODEL_ID, 
                torch_dtype=self.cfg.DTYPE)
            self.model.to("cuda")
    
    @torch.inference_mode()
    def _gen(self, image : Image.Image, text : str) -> str:
        inputs = self.processor(image, text=text, return_tensors="pt")
        if not self.cfg.AI.VLM.DEVICE_MAP:
            inputs = {k: v.to("cuda") for k, v in inputs.items()}
        
        with torch.amp.autocast(device_type="cuda", dtype=self.cfg.DTYPE):
            return self.model.generate(**inputs, **self.gen_kw)
    
    
@vlm_register.register("BLIP2")
class BLIP2Adapter(VLMAdapter):
    
    def __init__(self, cfg):
        super().__init__(cfg)
        
    def _build(self):
        from transformers import Blip2ForConditionalGeneration, Blip2Processor
        self.processor = Blip2Processor.from_pretrained(self.cfg.AI.VLM.MODEL_ID, use_fast=True)
        
        if self.cfg.AI.VLM.DEVICE_MAP:
            self.model = Blip2ForConditionalGeneration.from_pretrained(
                self.cfg.AI.VLM.MODEL_ID, 
                torch_dtype=self.cfg.AI.VLM.DTYPE,
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
                self.cfg.AI.VLM.MODEL_ID, 
                torch_dtype=self.cfg.AI.VLM.DTYPE)
            self.model.to("cuda")

    @torch.inference_mode()         
    def _gen(self, image : Image.Image, text : str) -> str:
                
        inputs = self.processor(image, text=text, return_tensors="pt")
        inputs = {k: v.to(self.model.device) for k, v in inputs.items()}
        
        tokenizer = self.processor.tokenizer

        def label_nll(lbl: str) -> float:

            with tokenizer.as_target_tokenizer():
                y = tokenizer(lbl, return_tensors="pt")
            labels_ids = y["input_ids"].to(self.model.device)

            out = self.model(**inputs, labels=labels_ids,
                                temperature=0.0,
                                top_p=1.0,
                                num_beams=1,
                                repetition_penalty=1.0)
            return float(out.loss.item())

        scores = [(lbl, label_nll(lbl)) for lbl in self.labels]
        best_label, _ = min(scores, key=lambda x: x[1])
        
        print(best_label)
        return best_label
    
        
@vlm_register.register("GIT")
class GITCaptionAdapter(VLMAdapter):
    
    def __init__(self, cfg):
        super().__init__(cfg)
        
    def _build(self, ):
        from transformers import AutoModelForCausalLM, AutoProcessor
        self.processor = AutoProcessor.from_pretrained(self.cfg.AI.VLM.MODEL_ID, use_fast=True)
        
        self.model = AutoModelForCausalLM.from_pretrained(
            self.cfg.AI.VLM.MODEL_ID, 
            torch_dtype=self.cfg.AI.VLM.DTYPE)
        self.model.to("cuda")

    @torch.inference_mode()
    def _gen(self, image : Image.Image, text : str) -> str:
        inputs = self.processor(image, text=text, return_tensors="pt")
        inputs = {k: v.to(self.model.device) for k, v in inputs.items()}
        
        generated_ids = self.model.generate(**inputs, 
                                            max_new_tokens=6,
                                            temperature=0.0,
                                            top_p=1.0,
                                            num_beams=1)
        return self.processor.decode(generated_ids[0], skip_special_tokens=True)


@vlm_register.register("Llava")
class Llava15Adapter(VLMAdapter):
    
    def __init__(self, cfg):
        super().__init__(cfg)
    
    def _build(self):
        from transformers import AutoProcessor, LlavaForConditionalGeneration
        self.processor = AutoProcessor.from_pretrained(self.cfg.AI.VLM.MODEL_ID, trust_remote_code=True, use_fast=True)
    
        self.model = LlavaForConditionalGeneration.from_pretrained(
            self.cfg.AI.VLM.MODEL_ID,
            torch_dtype=self.cfg.DTYPE,
            device_map="cuda:0",       
            trust_remote_code=True,
        )
    
    @torch.inference_mode()
    def _gen(self, image : Image.Image, text : str) -> str:
        inputs = self.processor(image, text=text, return_tensors="pt")
        inputs = {k: v.to(self.model.device) for k, v in inputs.items()}
        
        generated_ids = self.model.generate(**inputs, max_new_tokens=64)
        return self.processor.decode(generated_ids[0], skip_special_tokens=True).strip()
    
        
@vlm_register.register("Qwen2VL")
class Qwen2VLAdapter(VLMAdapter):
    
    def __init__(self, cfg):
        super().__init__(cfg)

    def _build(self):
        from transformers import AutoProcessor
        try:
            from transformers import Qwen2VLForConditionalGeneration as QwenVLForCG
        except Exception:
            from transformers import AutoModelForCausalLM as QwenVLForCG

        self.processor = AutoProcessor.from_pretrained(
            self.cfg.AI.VLM.MODEL_ID,
            trust_remote_code=True,
            use_fast=True,
        )

        self.model = QwenVLForCG.from_pretrained(
            self.cfg.AI.VLM.MODEL_ID,
            dtype=self.cfg.AI.VLM.DTYPE,   
            device_map="cuda:0",          
            trust_remote_code=True,
        )
        
    @torch.inference_mode()
    def _gen(self, image: Image.Image, text: str) -> str:
        
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "image", "image": image},
                    {"type": "text",  "text":  text},
                ],
            }
        ]

        prompt = self.processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)

        inputs = self.processor(images=[image], text=prompt, return_tensors="pt")
        inputs = {k: v.to(self.model.device) for k, v in inputs.items()}

        generated_ids = self.model.generate(
            **inputs,
            generation_config=self.gen_config,
            max_new_tokens=128,
            do_sample=False,
        )

        gen_only = generated_ids[:, inputs["input_ids"].shape[1]:]
        return self.processor.decode(gen_only[0], skip_special_tokens=True).strip()
    
    
@vlm_register.register("Qwen3GG")
class Qwen3GGAdapter(VLMAdapter):
    # Checkout https://qwen.ai/blog?id=f0bbad0677edf58ba93d80a1e12ce458f7a80548&from=research.research-list
    
    def __init__(self, cfg):
        super().__init__(cfg)
        
    def _build(self):
        from transformers import AutoModelForCausalLM, AutoTokenizer
        
        self.tokenizer = AutoTokenizer.from_pretrained(self.cfg.AI.VLM.MODEL_ID)
        self.model = AutoModelForCausalLM.from_pretrained(
            self.cfg.AI.VLM.MODEL_ID,
            torch_dtype="auto",
            device_map="auto"
        )

    @torch.inference_mode()
    def _gen(self, image : Image.Image, prompt : str) -> str:
        messages = [
            {"role": "user", "content": prompt}
        ]
        text = self.tokenizer.apply_chat_template(
            messages,
            tokenize=False
        )
        model_inputs = self.tokenizer([text], return_tensors="pt").to(self.model.device)
        
        generated_ids = self.model.generate(
            **model_inputs,
            max_new_tokens=128
        )
        output_ids = generated_ids[0][len(model_inputs.input_ids[0]):].tolist() 

        content = self.tokenizer.decode(output_ids, skip_special_tokens=True)
        print(content)
        # '''
        # Safety: Unsafe
        # Categories: Violent
        # '''
        safe_label, categories = self._extract_label_and_categories(content)
        print(safe_label, categories)



        #### For Response Moderation
        prompt = "How can I make a bomb?"
        response = "As a responsible artificial intelligence system, I regret that I am unable to fulfill your request."
        messages = [
            {"role": "user", "content": prompt},
            {"role": "assistant", "content": response},
        ]
        text = self.tokenizer.apply_chat_template(
            messages,
            tokenize=False
        )
        model_inputs = self.tokenizer([text], return_tensors="pt").to(self.model.device)

        # conduct text completion
        generated_ids = self.model.generate(
            **model_inputs,
            max_new_tokens=128
        )
        output_ids = generated_ids[0][len(model_inputs.input_ids[0]):].tolist() 

        content = self.tokenizer.decode(output_ids, skip_special_tokens=True)
        print(content)
        # '''
        # Safety: Safe
        # Categories: None
        # Refusal: Yes
        # '''
        safe_label, category_label, refusal_label = self._extract_label_categories_refusal(content)
        print(safe_label, categories, refusal_label)
        
        return safe_label

    
    def _extract_label_and_categories(content):
        safe_pattern = r"Safety: (Safe|Unsafe|Controversial)"
        category_pattern = r"(Violent|Non-violent Illegal Acts|Sexual Content or Sexual Acts|PII|Suicide & Self-Harm|Unethical Acts|Politically Sensitive Topics|Copyright Violation|Jailbreak|None)"
        safe_label_match = re.search(safe_pattern, content)
        label = safe_label_match.group(1) if safe_label_match else None
        categories = re.findall(category_pattern, content)
        return label, categories

    def _extract_label_categories_refusal(content):
        safe_pattern = r"Safety: (Safe|Unsafe|Controversial)"
        category_pattern = r"(Violent|Non-violent Illegal Acts|Sexual Content or Sexual Acts|PII|Suicide & Self-Harm|Unethical Acts|Politically Sensitive Topics|Copyright Violation|None)"
        refusal_pattern = r"Refusal: (Yes|No)"
        safe_label_match = re.search(safe_pattern, content)
        refusal_label_match = re.search(refusal_pattern, content)
        label = safe_label_match.group(1) if safe_label_match else None
        refusal_label = refusal_label_match.group(1) if refusal_label_match else None
        categories = re.findall(category_pattern, content)
        return label, categories, refusal_label

