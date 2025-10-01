from typing import List, Optional

from fastapi import APIRouter, Depends, File, Request, UploadFile

from SomniAI.queue import Queue
from SomniAI.registry import get_cfg

router = APIRouter()
SomniAI_cfg = get_cfg()

def get_Queue():
    return Queue.get_instance()


@router.post("/upload-vlm")
async def upload_air(request : Request, files: Optional[List[UploadFile]] = File(None), 
                 queue=Depends(get_Queue)):

    json_body = await request.json()
    await queue.enqueue_vlm(json_body["motor_id"])   

    return {"msg": "succeed to send data"}


@router.post("/upload-vision")
async def upload_vision(request : Request, files: Optional[List[UploadFile]] = File(None), 
                 queue=Depends(get_Queue)):

    json_body = await request.json()
    await queue.enqueue_vision(json_body["keypoints"])   

    return {"msg": "succeed to send data"}