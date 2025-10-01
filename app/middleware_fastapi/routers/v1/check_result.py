from fastapi import APIRouter, Depends, Request

from SomniAI.queue import Queue

router = APIRouter()

def get_Queue():
    return Queue.get_instance()


@router.get('./vlm')
async def vlm(request : Request, queue=Depends(get_Queue)):
    
    message = await queue.get_vlm_result()
    
    return {"motor_id" : message}
    

@router.get('./vision')
async def vision(request : Request, queue=Depends(get_Queue)):
    
    message = await queue.get_vision_result()
    
    return {"motor_id" : message}