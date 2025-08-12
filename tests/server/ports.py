from typing import Protocol, Dict, Any, Tuple, Optional, Callable


    
class TensorProvider(Protocol):
    def make_payload(self, ) -> bytes : ...
    
    