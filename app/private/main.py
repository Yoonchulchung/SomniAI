import argparse
import asyncio
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI
from hypercorn.asyncio import serve
from hypercorn.config import Config

import inference.application.registry as registry
from inference.application.config import load_config
from boot_loader import bootstrap, shutdown

parser = argparse.ArgumentParser(description="SomniAI FastAPI Server")
parser.add_argument('config', type=str, help="FastAPI config path")
args = parser.parse_args()

SomniAI_cfg = load_config(args.config)
registry.set_cfg(SomniAI_cfg)

@asynccontextmanager
async def lifespan(app: FastAPI):
    await bootstrap()

    yield

    await shutdown()

app = FastAPI(lifespan=lifespan)

from inference.interface.api.v1 import health, ping, upload, model_control
from inference.interface.view.v1 import main, check_result

app.include_router(health.router, prefix=SomniAI_cfg.FASTAPI.API_PREFIX, tags=["health"])
app.include_router(ping.router, prefix=SomniAI_cfg.FASTAPI.API_PREFIX, tags=["ping"])
app.include_router(main.router, tags=["main"])

app.include_router(check_result.router, prefix=SomniAI_cfg.FASTAPI.API_PREFIX, tags=["result"])
app.include_router(upload.router, prefix=SomniAI_cfg.FASTAPI.API_PREFIX, tags=["upload"])
app.include_router(model_control.router, prefix=SomniAI_cfg.FASTAPI.API_PREFIX, tags=["model"])


async def start():
    config = Config()
    config.bind = [f"{SomniAI_cfg.FASTAPI.HOST}:{SomniAI_cfg.FASTAPI.PORT}"]

    # Hot reload 설정
    config.use_reloader = getattr(SomniAI_cfg.FASTAPI, "RELOAD", True)

    # Worker 수 설정 (reload 사용 시 1로 제한)
    if config.use_reloader:
        config.workers = 1
    else:
        config.workers = getattr(SomniAI_cfg.FASTAPI, "WORKERS", 1)

    config.loglevel = getattr(SomniAI_cfg.FASTAPI, "LOG_LEVEL", "info").lower()

    await serve(app, config)
    
if __name__ == "__main__":
    asyncio.run(start())