from typing import Protocol, Dict, Any, Tuple, Optional, Callable

class Transport(Protocol):
    def post_bytes(self, data: bytes, headers: Dict[str, str]) -> Tuple[int, bytes]: ...
    def post_json(self, obj: Dict[str, Any], headers: Optional[Dict[str, str]] = None) \
                                        -> Tuple[int, bytes]: ...

    
class TensorProvider(Protocol):
    def make_payload(self, ) -> bytes : ...
    
    