
import torch
from SomniAI.log import SomniAI_log        
        
def predict(model, batch, gpu_id):

    batch = batch.to('cuda')
    
    try:
        with torch.no_grad():
            predictions = model[gpu_id](batch, verbose=False)
    except Exception as e:
        SomniAI_log(f"[Error] Error occured while inferencing image : {e}")
    return predictions


