from typing import List, Optional

from fastapi import (APIRouter, Depends, File, HTTPException, Request,
                     UploadFile)
from modules.inference.application.parser import RequestParserPIL
from modules.inference.application.process import AirProcess, SideProcess
from modules.inference.application.registry import get_cfg

router = APIRouter()
SomniAI_cfg = get_cfg()


def get_parser():
    return RequestParserPIL(SomniAI_cfg.HTTP)

def get_Process_Air():
    return AirProcess.get_instance()

def get_Process_Side():
    return SideProcess.get_instance()

@router.post("/upload-air")
async def upload_air(request : Request, files: Optional[List[UploadFile]] = File(None), 
                 parser = Depends(get_parser), process = Depends(get_Process_Air)):
    '''
    Please send bytes data. Do not send Pytorch Tensor format.
    '''
    
    try:
        dataset = await parser.get_img(request, files)
        await process.enqueue_request(dataset)   

        return {"msg": "succeed to send data"}
    
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=f"Failed to enqueue VLM data: {str(e)}")


@router.post("/upload-side")
async def upload_side(request : Request, files: Optional[List[UploadFile]] = File(None), 
                 parser = Depends(get_parser), process = Depends(get_Process_Side)):
    '''
    Please send bytes data. Do not send Pytorch Tensor format.
    '''

    try:
        dataset = await parser.get_img(request, files)
        await process.enqueue_request(dataset)
        
        return {"msg": "succeed to send data"}

    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=f"Failed to enqueue VLM data: {str(e)}")