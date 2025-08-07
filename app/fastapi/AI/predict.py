from PIL import Image
import io
import utils


async def use_gpu(model, img):
    
    img = utils.process_image_base64(img)
    pred = predict(model, img)
        
    ### Process the predictions as needed
    
    return ...
        
        
def predict(model, image):
    predictions = model(image, verbose=False)
    return predictions


