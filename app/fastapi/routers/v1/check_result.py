from SomniAI.router import health_check
from fastapi import APIRouter, Request, Depends

from SomniAI.process import ProcessGPU
router = APIRouter()

@router.get("/result")
async def result(request: Request, ):
    gpu = ProcessGPU.get_instance()
    return await gpu.get_result()