import threading
from typing import Any, Callable, Dict, Optional


class Registry:
    def __init__(self):
        self._map: Dict[str, Callable] = {}
        self._instances: Dict[str, Any] = {}
        self._lock = threading.RLock()
        
    def register(self, name: str):
        def _wrap(cls_or_fn):
            self._map[name] = cls_or_fn
            return cls_or_fn
        return _wrap

    def get_cls(self, model_name: str):
        
        if not model_name in self.list():
            raise ValueError(f"[{model_name}] is not registered. available models : {self.list()}")
        else:
            return self._map[model_name]

    def set_inst(self, model_name: str, instance: Optional[Any] = None, *args, **kwargs) -> Any:
        
        with self._lock:
            if instance is None:
                cls_or_fn = self.get_cls(model_name)
                instance = cls_or_fn(*args, **kwargs)
            self._instances[model_name] = instance
            return instance
    

    def get_inst(self, model_name: str, *args, **kwargs) -> Any:
        with self._lock:
            if model_name in self._instances:
                return self._instances[model_name]
            return self.set_inst(model_name, None, *args, **kwargs)

    def list(self):
        return list(self._map.keys())
    
vlm_register  = Registry()
pose_register = Registry()

