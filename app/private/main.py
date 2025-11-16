import argparse
import asyncio
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI
from hypercorn.asyncio import serve
from hypercorn.config import Config

import inference.application.registry as registry
from boot_loader import bootstrap, shutdown
from inference.application.config import load_config
from inference.containers import InferenceContainer

parser = argparse.ArgumentParser(description="SomniAI FastAPI Server")
parser.add_argument('config', type=str, help="FastAPI config path")
args = parser.parse_args()

SomniAI_cfg = load_config(args.config)

registry.set_cfg(SomniAI_cfg)

# Container 초기화 및 wiring
container = InferenceContainer()
container.wire(packages=["inference"])

@asynccontextmanager
async def lifespan(app: FastAPI):
    await bootstrap()

    yield

    await shutdown()

app = FastAPI(lifespan=lifespan)

from inference.interface.api.v1 import health, ping, upload
from inference.interface.view.v1 import main, check_result

app.include_router(health.router, prefix=SomniAI_cfg.FASTAPI.API_PREFIX, tags=["health"])
app.include_router(ping.router, prefix=SomniAI_cfg.FASTAPI.API_PREFIX, tags=["ping"])
app.include_router(main.router, tags=["main"])

app.include_router(check_result.router, prefix=SomniAI_cfg.FASTAPI.API_PREFIX, tags=["result"])
app.include_router(upload.router, prefix=SomniAI_cfg.FASTAPI.API_PREFIX, tags=["upload"])


async def start():
    config = Config()
    config.bind = [f"{SomniAI_cfg.FASTAPI.HOST}:{SomniAI_cfg.FASTAPI.PORT}"]
    config.use_reloader = getattr(SomniAI_cfg.FASTAPI.RELOAD, "RELOAD", True)
    config.workers = SomniAI_cfg.FASTAPI.WORKERS
    config.loglevel = getattr(SomniAI_cfg.FASTAPI.LOG_LEVEL, "LOG_LEVEL", "info").lower()

    await serve(app, config)
    
if __name__ == "__main__":
    asyncio.run(start())