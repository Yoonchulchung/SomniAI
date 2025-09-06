from SomniAI.log import SomniAI_log
from SomniAI.process import ProcessGPU
from SomniAI.AI import GPUModelLoader
from SomniAI.AI.registry import vlm_register, vision_register
from SomniAI.AI import Inference
from SomniAI.AI import Dataset
from SomniAI.registry import get_cfg

import asyncio

async def bootstrap() -> ProcessGPU:
    # We build everything in bootstrap
    SomniAI_log("=" * 10, " SomniAI FastAPI Server ", "=" * 10)

    SomniAI_cfg = get_cfg()
    gpu = ProcessGPU(SomniAI_cfg.AI, 
                     SomniAI_cfg.HTTP, 
                     Inference(SomniAI_cfg.AI.VLM_PROMPT, SomniAI_cfg.AI.VLM_QUESTION), 
                     Dataset(SomniAI_cfg.AI), 
                     SomniAI_log)
    
    model_loader = GPUModelLoader(SomniAI_cfg.AI,
                                  SomniAI_cfg.AI.FREE_MEM_THRESHOLD,
                                  vlm_register=vlm_register,
                                  vision_register=vision_register, 
                                  logger=SomniAI_log)
    
    model = await model_loader.get_model(SomniAI_cfg.AI.MODEL_NAME, 0)
    await gpu.add_model(model, 0)
    
    return gpu


def shutdown() -> None:
    
    # delete model
    SomniAI_log("Bye!")
