from PIL import Image
import io
import base64


def predict(model, image):
    
    image = base64.decode(image) if is_base64(image) else image
    
    image = Image.open(io.BytesIO(image)) 
    predictions = model(image, verbose=False)
    return predictions


def is_base64(s: str) -> bool:
    if not s or not isinstance(s, str):
        return False
    try:
        base64.b64decode(s, validate=True)
        return True
    except Exception:
        return False