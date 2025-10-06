import argparse
import asyncio

from fastapi import FastAPI
from hypercorn.asyncio import serve
from hypercorn.config import Config

import SomniAI.application.registry as registry
from SomniAI.application.boot_loader import bootstrap, shutdown
from SomniAI.application.config import load_config

from containers import Container

parser = argparse.ArgumentParser(description="SomniAI FastAPI Server")
parser.add_argument('config', type=str, help="FastAPI config path")
args = parser.parse_args()

SomniAI_cfg = load_config(args.config)

registry.set_cfg(SomniAI_cfg)


from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(app: FastAPI):
    gpu = await bootstrap()
    asyncio.create_task(gpu.air_micro_scheduler())
    asyncio.create_task(gpu.side_micro_scheduler())
    
    yield
    
    await shutdown()


app = FastAPI(lifespan=lifespan)

from SomniAI.infra import check_result, health, main, ping, upload

app.include_router(health.router, prefix=SomniAI_cfg.FASTAPI.API_PREFIX, tags=["health"])
app.include_router(upload.router, prefix=SomniAI_cfg.FASTAPI.API_PREFIX, tags=["upload"])
app.include_router(ping.router, prefix=SomniAI_cfg.FASTAPI.API_PREFIX, tags=["ping"])
app.include_router(check_result.router, prefix=SomniAI_cfg.FASTAPI.API_PREFIX, tags=["result"])
app.include_router(main.router, tags=["main"])

app.container = Container()

async def start():
    config = Config()
    config.bind = [f"{SomniAI_cfg.FASTAPI.HOST}:{SomniAI_cfg.FASTAPI.PORT}"]
    config.use_reloader = getattr(SomniAI_cfg.FASTAPI.RELOAD, "RELOAD", True)
    config.workers = SomniAI_cfg.FASTAPI.WORKERS
    config.loglevel = getattr(SomniAI_cfg.FASTAPI.LOG_LEVEL, "LOG_LEVEL", "info").lower()

    await serve(app, config)
    
if __name__ == "__main__":
    asyncio.run(start())