from threading import RLock
from typing import Any

_CFG: Any = None
_lock = RLock()

def get_cfg() -> Any:
    global _CFG
    
    with _lock:
        if _CFG is None:
            raise RuntimeError("cfg has not been set. Call set_cfg(cfg) first.")
        return _CFG

def set_cfg(cfg: Any, overwrite: bool = False) -> None:
    global _CFG
    with _lock:
        if _CFG is not None and not overwrite:
            raise RuntimeError("cfg is already set. Use overwrite=True if you really need to replace it.")
        _CFG = cfg