import gc
from typing import Any, Callable

import torch


class ModelLoaderInterface:
    
    def get_model(self, model_name):
        raise NotImplemented

class GPUModelLoader(ModelLoaderInterface):
    # Only GPU Load is allowed

    def __init__(self, 
                 cfg,
                 free_mem_threshold : float = 2.0, # Bytes
                 vision_register : Callable = None,
                 vlm_register : Callable = None,
                 logger : Callable = None,
                 ):
        super().__init__()
        
        self.cfg = cfg
        self.free_mem_threshold = free_mem_threshold
    
        self.vision_register = vision_register
        self.vlm_register = vlm_register
        
        self.logger = logger
        if not torch.cuda.is_available():
            raise ValueError("GPU is not available")
        
    def _check_mem_ok(self, gpu_id) -> bool:
        
        try:
            free_b, total_b = torch.cuda.mem_get_info()
        except Exception:
            props = torch.cuda.get_device_properties(gpu_id)
            total_b = props.total_memory
            free_b = max(0, total_b - torch.cuda.memory_reserved(gpu_id) - torch.cuda.memory_allocated(gpu_id))
            self.logger(free_b)
        return free_b >= self.free_mem_threshold
    
    def _load_vlm(self, model_name):
        self.vlm_register.get_cls(model_name)
        model = self.vlm_register.set_inst(model_name, None, self.cfg.AI.VLM)
        return model
        
    def _load_vision(self, model_name):
        
        self.vision_register.get_cls(model_name)
        model = self.vision_register.set_inst(model_name, None, self.cfg.AI.VISION)
        return model
        
    def _load_llm(self, model_name, gpu_id):
        ...
    
    def get_model_list(self):
        return [self.vlm_register.list(), self.vision_register.list()]
        
    async def get_model(self, model_name):
        
        self.logger(f"{model_name} is loading...")
        in_vision = model_name in self.vision_register.list()
        in_vlm    = model_name in self.vlm_register.list()
        
        if not (in_vision or in_vlm):
            raise ValueError(
                f"Unknown model_name: '{model_name}'.\n"
                f"Available vision: {list(self.vision_register.list())}\n"
                f"available vlm: {list(self.vlm_register.list())}\n"
            )

        try:
            if in_vlm:
                model = self._load_vlm(model_name)
            else :
                model = self._load_vision(model_name)
            
            if model is None:
                raise KeyError(f"Registry returned None for '{model_name}'")

            if not self._check_mem_ok(0):
                del model
                gc.collect()
                torch.cuda.empty_cache()
        except Exception as e:
            try:
                if model is not None:
                    del model
                gc.collect()
                torch.cuda.empty_cache()
            finally:
                raise RuntimeError(f"Failed to instantiate '{model_name}'. {e}")
        
        self.logger(f"{model_name} is loaded!")
        return model