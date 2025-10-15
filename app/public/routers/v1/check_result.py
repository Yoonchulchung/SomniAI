from fastapi import APIRouter, Depends, Request

from SomniAI.queue import Queue

router = APIRouter()

def get_Queue():
    return Queue.get_instance()


@router.get('/pillow')
async def pillow(request : Request, queue=Depends(get_Queue)):
    
    #message = await queue.get_vlm_result()
    
    return {"motor_id" : 0}
    

@router.get('/pose')
async def pose(request : Request, queue=Depends(get_Queue)):
    
    #message = await queue.get_vision_result()
    
    return {
            "neck" : "10, 20",
            "left_shoulder" : "20, 30",
            "right_shoulder" : "30, 40",
            }