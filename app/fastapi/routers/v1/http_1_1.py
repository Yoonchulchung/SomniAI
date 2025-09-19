from typing import List, Optional

from fastapi import APIRouter, Depends, File, Request, UploadFile

from SomniAI.process import ProcessGPU
from SomniAI.registry import get_cfg
from SomniAI.router.http_1_1 import Response_HTTP_1_1

router = APIRouter()
SomniAI_cfg = get_cfg()


def get_HTTP_parser():
    return Response_HTTP_1_1(SomniAI_cfg.HTTP)

def get_ProcessGPU():
    return ProcessGPU.get_instance()

@router.post("/upload/tensor")
async def upload_http_1_1(request : Request, files: Optional[List[UploadFile]] = File(None), 
                 http = Depends(get_HTTP_parser), gpu = Depends(get_ProcessGPU)):
    '''
    Please send bytes data. Do not send Pytorch Tensor format.
    '''

    dataset = await http.get_tensor(request, files)
    await gpu.enqueue_batch_or_tensor(dataset)   

    return {"msg": "succeed to send data"}



@router.post("/upload/pil")
async def upload_http_1_1(request : Request, files: Optional[List[UploadFile]] = File(None), 
                 http = Depends(get_HTTP_parser), gpu = Depends(get_ProcessGPU)):
    '''
    Please send bytes data. Do not send Pytorch Tensor format.
    '''

    dataset = await http.get_pil(request, files)
    await gpu.enqueue_batch(dataset)   

    return {"msg": "succeed to send data"}