from PIL import Image


def predict(model, image_Bytes):
    image = Image.open(image_Bytes) 
    predictions = model(image, verbose=False)
    return predictions