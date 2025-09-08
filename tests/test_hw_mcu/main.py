import asyncio
import logging
from typing import Optional
from fastapi import FastAPI, Query
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field
from contextlib import asynccontextmanager


app = FastAPI(title="SomniAI Motor Test Server", version="1.1.0")

ALLOWED_MOTOR_IDS = {0, 1, 2}

QUEUE_CAPACITY = 64
queue: "asyncio.Queue[int]" = asyncio.Queue(maxsize=QUEUE_CAPACITY)

logger = logging.getLogger("somniai")
logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s - %(message)s")

@asynccontextmanager
async def lifespan(app: FastAPI):
    
    for _ in range(30):
        try:
            queue.put_nowait(1)
        except asyncio.QueueFull:
            logger.warning("Queue full while preloading data")
            break
    logger.info("Preloaded 30 items (motor_id=1) into queue (size=%d)", queue.qsize())

    yield  

    logger.info("Shutting down app... clearing queue")
    while not queue.empty():
        queue.get_nowait()


app = FastAPI(
    title="SomniAI Motor Test Server",
    version="1.1.0",
    lifespan=lifespan,
)

class MotorItem(BaseModel):
    motor_id: int = Field(..., description="모터 ID (0, 1, 2) 중 하나")

@app.get("/go/get_data")
async def get_data():
    
    try:
        motor_id = queue.get_nowait()
    except asyncio.QueueEmpty:
        logger.info("POP → empty queue → 204")
        return Response(status_code=204)

    logger.info("POP ← motor_id=%s (size=%d)", motor_id, queue.qsize())
    return JSONResponse({"motor_id": motor_id})
