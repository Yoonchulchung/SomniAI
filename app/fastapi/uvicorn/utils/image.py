import base64
from PIL import Image
import io



def process_image_base64(img) -> Image:
    '''
    Not Recommended to ues base64 due to long delay in encoding and decoding process.
    '''

    img = base64.decode(img) if is_base64(img) else img
    img = Image.open(io.BytesIO(img))   
    
    return img

def is_base64(s: str) -> bool:
    if not s or not isinstance(s, str):
        return False
    try:
        base64.b64decode(s, validate=True)
        return True
    except Exception:
        return False
    