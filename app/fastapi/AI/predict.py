from PIL import Image
import io

def predict(model, image_Bytes):
    image = Image.open(io.BytesIO(image_Bytes)) 
    predictions = model(image, verbose=False)
    return predictions