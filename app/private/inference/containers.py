from dependency_injector import containers, providers

from inference.application.registry import get_cfg
from inference.application.logger import SomniAI_log
from inference.infrastructure.ai.registry import pose_register, vlm_register
from inference.infrastructure.ai.loader import GPUModelLoader
from inference.infrastructure.ai.inference import InferenceGPU
from inference.infrastructure.mqtt import SomniAIMQTT
from inference.application.process import Process
from inference.application.parser import RequestParserPIL
from inference.application.health_check import Rsponse_Health_Check
from inference.infrastructure.ai.dataset import Dataset


class InferenceContainer(containers.DeclarativeContainer):
    """
    Inference 모듈의 모든 의존성을 관리하는 컨테이너
    """

    wiring_config = containers.WiringConfiguration(
        packages=["inference"],
    )

    # Config (Callable로 제공)
    config = providers.Callable(get_cfg)

    # Logger (Callable로 제공)
    logger = providers.Object(SomniAI_log)

    # Registry (Singleton)
    pose_registry = providers.Object(pose_register)
    vlm_registry = providers.Object(vlm_register)

    # Model Loader (Singleton)
    model_loader = providers.Singleton(
        GPUModelLoader,
        cfg=config,
        registry={
            "pose_register": pose_registry,
            "vlm_register": vlm_registry,
        },
        logger=logger,
    )

    # MQTT (Singleton)
    mqtt = providers.Singleton(
        SomniAIMQTT,
        cfg=config,
    )

    # Inference Engine (Singleton)
    inference = providers.Singleton(
        InferenceGPU,
        model_loader=model_loader,
        cfg=config,
    )

    # Process (Singleton)
    process = providers.Singleton(
        Process,
        cfg=config,
        Inference=inference,
        MQTT=mqtt,
        logger=logger,
    )

    # Parser (Factory - 요청마다 새로 생성)
    parser = providers.Factory(
        RequestParserPIL,
        cfg=config().HTTP,
    )

    # Health Check (Factory)
    health_check = providers.Factory(
        Rsponse_Health_Check,
    )

    # Dataset (Factory)
    dataset = providers.Factory(
        Dataset,
        cfg=config().AI,
    )
