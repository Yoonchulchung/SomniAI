from typing import List, Optional

from fastapi import APIRouter, Depends, File, Request, UploadFile, HTTPException

from SomniAI.application.process import Process
from SomniAI.application.registry import get_cfg
from inference.application.parser import RequestParserPIL

router = APIRouter()
SomniAI_cfg = get_cfg()


def get_parser():
    return RequestParserPIL(SomniAI_cfg.HTTP)

def get_Process():
    return Process.get_instance()


@router.post("/upload-air")
async def upload_air(request : Request, files: Optional[List[UploadFile]] = File(None), 
                 parser = Depends(get_parser), process = Depends(get_Process)):
    '''
    Please send bytes data. Do not send Pytorch Tensor format.
    '''
    try:
        dataset = await parser.get_img(request, files)
        await process.enqueue_request_air(dataset)   

        return {"msg": "succeed to send data"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to enqueue VLM data: {str(e)}")


@router.post("/upload-side")
async def upload_side(request : Request, files: Optional[List[UploadFile]] = File(None), 
                 parser = Depends(get_parser), process = Depends(get_Process)):
    '''
    Please send bytes data. Do not send Pytorch Tensor format.
    '''

    try:
        dataset = await parser.get_img(request, files)
        await process.enqueue_request_side(dataset)
        
        return {"msg": "succeed to send data"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to enqueue VLM data: {str(e)}")