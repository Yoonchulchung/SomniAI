from typing import List, Optional, Annotated

from fastapi import (APIRouter, Depends, File, HTTPException, Request,
                     UploadFile)
from dependency_injector.wiring import inject, Provide

from inference.containers import InferenceContainer
from inference.application.parser import RequestParserPIL
from inference.application.process import Process

router = APIRouter()


@router.post("/upload-air")
@inject
async def upload_air(
    request: Request,
    files: Optional[List[UploadFile]] = File(None),
    parser: RequestParserPIL = Depends(Provide[InferenceContainer.parser]),
    process: Process = Depends(Provide[InferenceContainer.process])
):
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
@inject
async def upload_side(
    request: Request,
    files: Optional[List[UploadFile]] = File(None),
    parser: RequestParserPIL = Depends(Provide[InferenceContainer.parser]),
    process: Process = Depends(Provide[InferenceContainer.process])
):
    '''
    Please send bytes data. Do not send Pytorch Tensor format.
    '''

    try:
        dataset = await parser.get_img(request, files)
        await process.enqueue_request_side(dataset)
        
        return {"msg": "succeed to send data"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to enqueue VLM data: {str(e)}")