from .ports import TensorProvider
import torch
import io
from typing import Optional
from PIL import Image
import numpy as np

class TorchTensorProvider(TensorProvider):

    def __init__(self, cfg, **kwargs):
        self.cfg = cfg
        
        self.batch = self.cfg.batch
        self.img_size = self.cfg.img_size
        self.img_path = self.cfg.img_path
            
    def make_payload(self) -> bytes:
        
        if self.cfg.post_mode == 'rand':
            print("creating random data using torch...")
            if (self.batch is not None) and (self.img_size is not None):
                
                if self.batch <= 0 or self.img_size <= 0:
                    raise ValueError("batch, img_size must be positive.")
                
                arr = np.random.randint(0, 256, (self.cfg.img_size, self.cfg.img_size, 3), 
                                                                    dtype=np.uint8)
                img = Image.fromarray(arr, mode="RGB")
                buf = io.BytesIO()
                img.save(buf, format="JPEG", quality=90)
                
                return buf.getvalue()
            else:
                raise ValueError("batch and img_size must be provided!")
        
        elif self.cfg.post_mode == 'real':
            if self.img_path:
                with open(self.img_path, "rb") as f:
                    raw = f.read()
                return raw
            else:
                raise ValueError("img_path must be provided! ")
            
        else:
            raise ValueError(f"Content-Type should be one of these : {self.cfg.avail_content_type}")
        

    

    
    
    
        