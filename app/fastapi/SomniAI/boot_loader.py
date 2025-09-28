import os
import socket

import torch
from rich.console import Console
from rich.panel import Panel

from SomniAI.AI import Dataset, GPUModelLoader, Inference
from SomniAI.AI.registry import vision_register, vlm_register
from SomniAI.config import save_yaml
from SomniAI.log import SomniAI_log
from SomniAI.process import ProcessGPU
from SomniAI.registry import get_cfg


async def bootstrap() -> ProcessGPU:
    # We build everything in bootstrap
    SomniAI_log("=" * 10, " SomniAI FastAPI Server ", "=" * 10)
    
    if torch.cuda.is_available():
        gpu_ids = list(i for i in range(torch.cuda.device_count()))
    else:
        gpu_ids = None

    SomniAI_cfg = get_cfg()
    gpu = ProcessGPU(SomniAI_cfg.AI, 
                     SomniAI_cfg.HTTP, 
                     Inference(SomniAI_cfg.AI.VLM.PROMPT, SomniAI_cfg.AI.VLM.QUESTION, SomniAI_log), 
                     Dataset(SomniAI_cfg.AI), 
                     SomniAI_log)
    
    model_loader = GPUModelLoader(SomniAI_cfg,
                                  SomniAI_cfg.AI.FREE_MEM_THRESHOLD,
                                  vlm_register=vlm_register,
                                  vision_register=vision_register, 
                                  logger=SomniAI_log)
    
    vlm = await model_loader.get_model(SomniAI_cfg.AI.VLM.MODEL_NAME)
    await gpu.add_model(vlm, 0)
    
    work_dir = "./work_dir"
    
    if not os.path.exists(work_dir):
        os.mkdir(work_dir)
    
    save_yaml(SomniAI_cfg, f'{work_dir}/data.yaml')
    
    _print_info(SomniAI_cfg, model_loader)
    
    return gpu


def shutdown() -> None:
    
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