"""
Application Bootstrap Loader
"""
import asyncio
import os
import socket

from rich.console import Console
from rich.panel import Panel

from core.config import get_settings
from infrastructure.logging import get_logger
from modules.inference.infrastructure.ai.loader import GPUModelLoader
from modules.inference.infrastructure.ai.inference import SideInference, AirInference
from modules.inference.infrastructure.ai.registry import pose_register, vlm_register
from modules.inference.application.config import save_yaml
from modules.inference.domain.channel import ChannelType
from modules.inference.application.logger import SomniAI_log
from modules.inference.infrastructure.mqtt import SomniAIMQTT
from modules.inference.application.process import AirProcess, SideProcess
from modules.inference.application.registry import get_cfg
from modules.inference.application.model_manager import setup_model_manager

settings = get_settings()
logger = get_logger("bootstrap")

async def bootstrap() -> None:
    """
    애플리케이션 부트스트랩
    AI 모델, MQTT, 추론 프로세스 등을 초기화합니다.
    """
    logger.info("=" * 50)
    logger.info("SomniAI FastAPI Server Bootstrap")
    logger.info("=" * 50)

    SomniAI_cfg = get_cfg()

    registry = {
        "pose_register": pose_register,
        "vlm_register": vlm_register,
    }

    # AI Model Loader 초기화
    model_loader = GPUModelLoader(SomniAI_cfg, registry, SomniAI_log)

    # MQTT 초기화
    mqtt = SomniAIMQTT(SomniAI_cfg)

    # Side Inference 초기화
    side_inference = SideInference(model_loader, SomniAI_cfg)
    side_process = SideProcess(
        SomniAI_cfg,
        channel_type=ChannelType.SIDE,
        inference=side_inference,
        MQTT=mqtt,
        logger=SomniAI_log
    )

    # Air Inference 초기화
    air_inference = AirInference(model_loader, SomniAI_cfg)
    air_process = AirProcess(
        SomniAI_cfg,
        channel_type=ChannelType.AIR,
        inference=air_inference,
        MQTT=mqtt,
        logger=SomniAI_log
    )

    # Work directory 생성
    work_dir = "./work_dir"
    if not os.path.exists(work_dir):
        os.makedirs(work_dir)
        logger.info(f"Created work directory: {work_dir}")

    save_yaml(SomniAI_cfg, f'{work_dir}/data.yaml')

    # ModelManager 설정
    setup_model_manager(
        model_loader,
        side_inference,
        air_inference,
        side_process,
        air_process,
        SomniAI_cfg,
        SomniAI_log,
        mqtt
    )

    _print_info(SomniAI_cfg, model_loader)

    # 비동기 스케줄러 시작
    asyncio.create_task(side_process.micro_scheduler())
    asyncio.create_task(air_process.micro_scheduler())

    logger.info("Bootstrap completed successfully")


async def shutdown() -> None:
    """
    애플리케이션 종료 처리
    """
    logger.info("Shutting down application...")
    # TODO: Add cleanup logic (모델 언로드, 연결 종료 등)
    logger.info("Shutdown completed. Goodbye!")
    
    
def _print_info(SomniAI_cfg, model_loader):
    """서버 정보 출력"""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = "localhost"
    finally:
        s.close()

    console = Console()

    port = getattr(SomniAI_cfg.FASTAPI, "PORT", settings.PORT)

    lines = [
        f"Serving at: http://{ip}:{port}",
        f"API docs:   http://{ip}:{port}/docs",
        "",
        f"Available Inference Models: {model_loader.get_model_list()}",
    ]
    console.print("\n")
    console.print(Panel.fit(
        "\n".join(lines),
        title=f"FastAPI CLI - {SomniAI_cfg.type} mode",
        border_style="cyan",
    ))
    console.print("\n")