
from fastapi import APIRouter, Request

router = APIRouter()    
    
@router.post("/ping")
async def ping(request: Request):
    return {'pong' : "Hello"}
