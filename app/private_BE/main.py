"""
FastAPI Application Entry Point
"""
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
from core.config import get_settings
from infrastructure.logging import get_logger
from modules.inference.application.config import load_config

# Argument parser
parser = argparse.ArgumentParser(description="SomniAI FastAPI Server")
parser.add_argument('config', type=str, help="FastAPI config path")
args = parser.parse_args()

# Load inference config
SomniAI_cfg = load_config(args.config)
registry.set_cfg(SomniAI_cfg)

# Application settings
settings = get_settings()
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
from modules.inference.interface.view.v1 import check_result, main

# Include routers
app.include_router(auth_router, prefix=settings.API_PREFIX)
app.include_router(health.router, prefix=settings.API_PREFIX, tags=["health"])
app.include_router(ping.router, prefix=settings.API_PREFIX, tags=["ping"])
app.include_router(main.router, tags=["main"])
app.include_router(check_result.router, prefix=settings.API_PREFIX, tags=["result"])
app.include_router(upload.router, prefix=settings.API_PREFIX, tags=["upload"])
app.include_router(model_control.router, prefix=settings.API_PREFIX, tags=["model"])
app.include_router(api_log_router, prefix=settings.API_PREFIX)


async def start():
    """Start the application server"""
    config = Config()
    config.bind = [f"{settings.HOST}:{settings.PORT}"]
    config.use_reloader = settings.RELOAD
    config.workers = 1 if settings.RELOAD else settings.WORKERS
    config.loglevel = settings.LOG_LEVEL.lower()

    logger.info(f"Starting server on {settings.HOST}:{settings.PORT}")
    await serve(app, config)


if __name__ == "__main__":
    asyncio.run(start())