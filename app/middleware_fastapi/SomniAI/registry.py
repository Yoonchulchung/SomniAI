from threading import RLock
from typing import Any

_SOMNIAI_CFG: Any = None
_lock = RLock()

def get_cfg() -> Any:
    global _SOMNIAI_CFG
    
    with _lock:
        if _SOMNIAI_CFG is None:
            raise RuntimeError("cfg has not been set. Call set_cfg(cfg) first.")
        return _SOMNIAI_CFG

def set_cfg(cfg: Any, overwrite: bool = False) -> None:
    global _SOMNIAI_CFG
    with _lock:
        if _SOMNIAI_CFG is not None and not overwrite:
            raise RuntimeError("cfg is already set. Use overwrite=True if you really need to replace it.")
        _SOMNIAI_CFG = cfg