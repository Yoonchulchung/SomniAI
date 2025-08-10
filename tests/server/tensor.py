from .ports import TensorProvider
import torch
import io
from typing import Optional
from PIL import Image
import torchvision.transforms as T
from dataclasses import dataclass

@dataclass
class TorchTensorProvider(TensorProvider):
    
    batch : Optional[int] = None
    img_size : Optional[int] = None
    img_path : Optional[str] = None
    
    def make_payload(self) -> bytes:
        
        if (self.batch is not None) and (self.img_size is not None):
            
            if self.batch <= 0 or self.img_size <= 0:
                raise ValueError("batch, img_size must be positive.")
            
            tensor = torch.randn(self.batch, 3, self.img_size, self.img_size)    
            
        elif self.img_path:
            image = Image.open(self.img_path).convert('RGB')
            tensor = T.ToTensor(image)
   
        else:
            raise ValueError("[batch and image siz] or image path must be provided!")
        
        buf = io.BytesIO() ; torch.save(tensor, buf)
        return buf.getvalue()    
    

    
    
    
        