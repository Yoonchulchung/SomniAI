import asyncio
import os
import socket

from rich.console import Console
from rich.panel import Panel

from SomniAI.application.AI import GPUModelLoader, InferenceGPU
from SomniAI.application.AI.registry import pose_register, vlm_register
from SomniAI.application.config import save_yaml
from SomniAI.application.logger import SomniAI_log
from SomniAI.application.mqtt import SomniAIMQTT
from SomniAI.application.process import Process
from SomniAI.application.registry import get_cfg


async def bootstrap() -> None:
    # We build everything in bootstrap
    SomniAI_log("=" * 10, " SomniAI FastAPI Server ", "=" * 10)
    
    SomniAI_cfg = get_cfg()
    
    registry = {
        "pose_register" : pose_register,
        "vlm_register" : vlm_register,
    }
    
    model_loader = GPUModelLoader(SomniAI_cfg, registry, SomniAI_log)

    infernce = InferenceGPU(model_loader, SomniAI_cfg)
    mqtt = SomniAIMQTT(SomniAI_cfg)
 
    process = Process(SomniAI_cfg, infernce, mqtt, SomniAI_log)
    
    work_dir = "./work_dir"
    
    if not os.path.exists(work_dir):
        os.mkdir(work_dir)
    
    save_yaml(SomniAI_cfg, f'{work_dir}/data.yaml')
    
    _print_info(SomniAI_cfg, model_loader)
    
    asyncio.create_task(process.air_micro_scheduler())
    asyncio.create_task(process.side_micro_scheduler())


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