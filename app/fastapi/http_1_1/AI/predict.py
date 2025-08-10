from PIL import Image
import io
import utils
import torch

from utils import SomniAI_log

async def use_gpu(model, img):
    
    img = utils.process_image_base64(img)
    pred = predict(model, img)
        
    ### Process the predictions as needed
    
    return ...
        
        
def predict(model, batch, gpu_id):

    batch = batch.to('cuda')
    
    try:
        with torch.no_grad():
            predictions = model[gpu_id](batch, verbose=False)
    except Exception as e:
        SomniAI_log(f"[Error] Error occured while inferencing image : {e}")
    return predictions


