from fastapi import APIRouter, Request, UploadFile, File, Depends
from typing import Optional, List

from SomniAI.router.http_1_1 import Response_HTTP_1_1
from SomniAI.process import ProcessGPU
from SomniAI.registry import get_cfg

router = APIRouter()
SomniAI_cfg = get_cfg()


def get_HTTP_parser():
    return Response_HTTP_1_1(SomniAI_cfg.HTTP)

def get_ProcessGPU():
    return ProcessGPU(SomniAI_cfg.HTTP)


@router.post("/upload/http_1_1")
async def upload_http_1_1(request : Request, files: Optional[List[UploadFile]] = File(None), 
                 http = Depends(get_HTTP_parser), gpu = Depends(get_ProcessGPU)):
    '''
    Please send bytes data. Do not send Pytorch Tensor format.
    '''

    dataset = await http.get_tensor(request, files)
    await gpu.enqueue_batch_or_tensor(dataset)   

    return {"msg": "succeed to send data"}