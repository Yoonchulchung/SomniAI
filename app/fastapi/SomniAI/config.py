from dataclasses import dataclass
import base64
from PIL import Image
import io
import torchvision.transforms as transforms


@dataclass
class ServiceConfig:
    contentType = ['application/octet-stream', 'application/json']

    def process_base64_to_tensor(self, img) -> Image:
        '''
        Not Recommended to ues base64 due to long delay in encoding and decoding process.
        '''
        img = base64.b64decode(img) if self.is_base64(img) else img
        img = Image.open(io.BytesIO(img))   
        to_tensor_transform = transforms.ToTensor()
        tensor = to_tensor_transform(img)
        if tensor.ndim == 3:
            tensor = tensor.unsqueeze(0)
        elif tensor.ndim == 4:
            pass
        else:
            raise (f"Wrong tensor shape {tensor.shape}")
        
        return tensor

    def is_base64(self, s: str) -> bool:
        if not s or not isinstance(s, str):
            return False
        try:
            base64.b64decode(s, validate=True)
            return True
        except Exception:
            return False