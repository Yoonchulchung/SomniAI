import asyncio
import os
import socket

from rich.console import Console
from rich.panel import Panel

from inference.infrastructure.ai.loader import GPUModelLoader
from inference.infrastructure.ai.inference import SideInference, AirInference
from inference.infrastructure.ai.registry import pose_register, vlm_register
from inference.application.config import save_yaml
from inference.domain.channel import ChannelType
from inference.application.logger import SomniAI_log
from inference.infrastructure.mqtt import SomniAIMQTT
from inference.application.process import AirProcess, SideProcess
from inference.application.registry import get_cfg
from inference.application.queue_manager import ImageRequestQueue
from inference.application.model_manager import setup_model_manager

async def bootstrap() -> None:
    # We build everything in bootstrap
    SomniAI_log("=" * 10, " SomniAI FastAPI Server ", "=" * 10)
    
    SomniAI_cfg = get_cfg()
    
    registry = {
        "pose_register" : pose_register,
        "vlm_register" : vlm_register,
    }
    
    model_loader = GPUModelLoader(SomniAI_cfg, registry, SomniAI_log)

    mqtt = SomniAIMQTT(SomniAI_cfg)
    
    side_inference = SideInference(model_loader, SomniAI_cfg)
    side_process = SideProcess(
        SomniAI_cfg,
        channel_type=ChannelType.SIDE,
        inference=side_inference,
        MQTT=mqtt,
        logger=SomniAI_log
    )

    air_inference = AirInference(model_loader, SomniAI_cfg)
    air_process = AirProcess(
        SomniAI_cfg,
        channel_type=ChannelType.AIR,
        inference=air_inference,
        MQTT=mqtt,
        logger=SomniAI_log
    )
    
    work_dir = "./work_dir"
    
    if not os.path.exists(work_dir):
        os.mkdir(work_dir)
    
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

    asyncio.create_task(side_process.micro_scheduler())
    asyncio.create_task(air_process.micro_scheduler())


async def shutdown() -> None:
    
    # delete model
    SomniAI_log("Bye!")
    
    
def _print_info(SomniAI_cfg, model_loader):
    
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))  
        ip = s.getsockname()[0]
    finally:
        s.close()

    console = Console()
    
    lines = [
        f"Serving at: http://{ip}:{SomniAI_cfg.FASTAPI.PORT}",
        f"API docs:   http://{ip}:{SomniAI_cfg.FASTAPI.PORT}/docs",
        "",
        f"Available Infernce Models : {model_loader.get_model_list()}",
    ]
    console.print("\n")
    console.print(Panel.fit(
        "\n".join(lines),
        title=f"FastAPI CLI - {SomniAI_cfg.type} mode",
        border_style="cyan",
    ))
    console.print("\n")