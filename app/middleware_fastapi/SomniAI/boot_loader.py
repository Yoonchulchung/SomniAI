import os
import socket

import torch
from rich.console import Console
from rich.panel import Panel

from SomniAI.config import save_yaml
from SomniAI.log import SomniAI_log
from SomniAI.queue import Queue
from SomniAI.registry import get_cfg


async def bootstrap() -> None:
    # We build everything in bootstrap
    SomniAI_log("=" * 10, " SomniAI FastAPI Server ", "=" * 10)
    
    SomniAI_cfg = get_cfg()
    
    q = Queue(SomniAI_log)
    work_dir = "./work_dir"
    
    if not os.path.exists(work_dir):
        os.mkdir(work_dir)
    
    save_yaml(SomniAI_cfg, f'{work_dir}/data.yaml')
    
    _print_info(SomniAI_cfg)


async def shutdown() -> None:
    
    # delete model
    SomniAI_log("Bye!")
    
    
def _print_info(SomniAI_cfg):
    
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
    ]
    console.print("\n")
    console.print(Panel.fit(
        "\n".join(lines),
        title=f"FastAPI CLI - {SomniAI_cfg.type} mode",
        border_style="cyan",
    ))
    console.print("\n")