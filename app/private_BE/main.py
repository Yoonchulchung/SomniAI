import argparse
import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from hypercorn.asyncio import serve
from hypercorn.config import Config

# Modules
import modules.inference.application.registry as registry
from boot_loader import bootstrap, shutdown
from containers import Container

# Core & Infrastructure
from infrastructure.logging import get_logger
from core.config.settings import Settings

# Argument parser
parser = argparse.ArgumentParser(description="SomniAI FastAPI Server")
parser.add_argument('config', type=str, help="FastAPI config path")
args = parser.parse_args()

# Application settings
SomniAI_cfg = settings = Settings.from_yaml(args.config)
registry.set_cfg(SomniAI_cfg)
logger = get_logger("somniai")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    container = Container()
    container.wire(packages=["modules"])

    await bootstrap()
    logger.info("Application started successfully")

    yield

    # Shutdown
    await shutdown()
    logger.info("Application shutdown completed")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
)

from modules.api_log.interface.api import router as api_log_router
from modules.auth.interface.api import router as auth_router

# Import routers
from modules.inference.interface.api.v1 import health, model_control, ping, upload
from modules.inference.interface.view.v1 import main

from modules.inference.interface.view.v1.air import result_air
from modules.inference.interface.view.v1.side import result_side

# Include routers
app.include_router(auth_router, prefix=settings.FASTAPI.API_PREFIX)
app.include_router(health.router, prefix=settings.FASTAPI.API_PREFIX, tags=["health"])
app.include_router(ping.router, prefix=settings.FASTAPI.API_PREFIX, tags=["ping"])
app.include_router(upload.router, prefix=settings.FASTAPI.API_PREFIX, tags=["upload"])
app.include_router(model_control.router, prefix=settings.FASTAPI.API_PREFIX, tags=["model"])
app.include_router(api_log_router, prefix=settings.FASTAPI.API_PREFIX)

app.include_router(main.router, tags=["main"])
app.include_router(result_air.router, prefix=settings.FASTAPI.VIEW_PREFIX, tags=["air_view"])
app.include_router(result_side.router, prefix=settings.FASTAPI.VIEW_PREFIX, tags=["side_view"])


async def start():
    """Start the application server"""
    config = Config()
    config.bind = [f"{settings.FASTAPI.HOST}:{settings.FASTAPI.PORT}"]
    config.use_reloader = settings.FASTAPI.RELOAD
    config.workers = 1 if settings.FASTAPI.RELOAD else settings.FASTAPI.WORKERS
    config.loglevel = settings.FASTAPI.LOG_LEVEL.lower()

    logger.info(f"Starting server on {settings.FASTAPI.HOST}:{settings.FASTAPI.PORT}")
    await serve(app, config)


if __name__ == "__main__":
    asyncio.run(start())