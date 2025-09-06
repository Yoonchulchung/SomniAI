from torchvision import transforms
import torch
import numpy as np
from PIL import Image

class Dataset:
    
    def __init__(self, cfg):
        self.cfg = cfg
        self.transform_pipeline = transforms.Compose([
                                        transforms.ToTensor(),
                                        transforms.Normalize(mean=self.cfg.NORM_MEAN,
                                                             std=self.cfg.NORM_STD)
                                    ])

        self.normalize_only = transforms.Normalize(mean=self.cfg.NORM_MEAN,
                                                   std=self.cfg.NORM_STD)

    def preprocess(self, imgs):

        if isinstance(imgs, (Image.Image, np.ndarray)):
            return self.transform_pipeline(imgs)

        if isinstance(imgs, torch.Tensor):
            tensor = imgs

            if tensor.ndim == 4 and tensor.shape[1] == 3:

                if tensor.dtype != torch.float32:
                    tensor = tensor.float()
                if tensor.max() > 1.0:
                    tensor = tensor / 255.0

                mean = torch.tensor([0.5, 0.5, 0.5], device=tensor.device)[None, :, None, None]
                std  = torch.tensor([0.5, 0.5, 0.5], device=tensor.device)[None, :, None, None]
                tensor = (tensor - mean) / std
                return tensor

            if tensor.ndim == 3 and tensor.shape[0] == 3:
                if tensor.dtype != torch.float32:
                    tensor = tensor.float()
                if tensor.max() > 1.0:
                    tensor = tensor / 255.0
                return self.normalize_only(tensor)

            raise ValueError(f"Unsupported tensor shape {tensor.shape}, expected [3,H,W] or [B,3,H,W]")

        raise TypeError(f"Unsupported input type: {type(imgs)}")
            
        

    