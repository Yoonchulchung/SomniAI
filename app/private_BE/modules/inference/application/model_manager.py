"""
Model Manager
런타임에 모델을 동적으로 변경할 수 있는 매니저
"""
import asyncio
from typing import Optional, Dict, Any
from modules.inference.infrastructure.ai.loader import GPUModelLoader
from modules.inference.infrastructure.ai.inference import SideInference, AirInference, IInference
from modules.inference.application.process import SideProcess, AirProcess, BaseGPUProcess


class ModelManager:
    """모델과 프로세스를 동적으로 관리하는 싱글톤 매니저"""

    _instance = None
    _lock = asyncio.Lock()

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelManager, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if hasattr(self, 'initialized') and self.initialized:
            return

        self.model_loader: Optional[GPUModelLoader] = None
        self.side_inference: Optional[SideInference] = None
        self.air_inference: Optional[AirInference] = None
        self.side_process: Optional[SideProcess] = None
        self.air_process: Optional[AirProcess] = None
        self.cfg = None
        self.logger = None
        self.mqtt = None
        self.initialized = False

    def setup(
        self,
        model_loader: GPUModelLoader,
        side_inference: SideInference,
        air_inference: AirInference,
        side_process: SideProcess,
        air_process: AirProcess,
        cfg,
        logger,
        mqtt
    ):
        """매니저 초기 설정"""
        self.model_loader = model_loader
        self.side_inference = side_inference
        self.air_inference = air_inference
        self.side_process = side_process
        self.air_process = air_process
        self.cfg = cfg
        self.logger = logger
        self.mqtt = mqtt
        self.initialized = True

    @classmethod
    def get_instance(cls) -> "ModelManager":
        """싱글톤 인스턴스 반환"""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def get_model_info(self) -> Dict[str, Any]:
        """현재 로드된 모델 정보 반환"""
        if not self.initialized or not self.model_loader:
            return {"error": "Model manager not initialized"}

        return {
            "pose_model": self.model_loader.get_pose_name(),
            "vlm_model": self.model_loader.get_vlm_name() if hasattr(self.model_loader, 'get_vlm_name') else None,
            "available_models": self.model_loader.get_model_list() if hasattr(self.model_loader, 'get_model_list') else [],
            "device": "cuda" if self.side_process and hasattr(self.side_process, 'device') else "unknown"
        }

    async def reload_side_model(self, new_cfg=None) -> Dict[str, str]:
        """
        Side 모델을 동적으로 재로드합니다.

        Args:
            new_cfg: 새로운 설정 (None이면 기존 설정 사용)

        Returns:
            결과 메시지
        """
        async with self._lock:
            try:
                self.logger("Starting side model reload...")

                # 설정 업데이트
                if new_cfg:
                    self.cfg = new_cfg

                # 기존 inference 삭제 (메모리 해제)
                old_inference = self.side_inference
                del old_inference

                # 새로운 inference 생성
                self.side_inference = SideInference(self.model_loader, self.cfg)

                # Process의 inference 업데이트
                if self.side_process:
                    self.side_process.inference = self.side_inference

                self.logger("Side model reloaded successfully")

                return {
                    "status": "success",
                    "message": "Side model reloaded successfully",
                    "model": self.model_loader.get_pose_name()
                }

            except Exception as e:
                self.logger.error(f"Failed to reload side model: {e}")
                return {
                    "status": "error",
                    "message": f"Failed to reload side model: {str(e)}"
                }

    async def reload_air_model(self, new_cfg=None) -> Dict[str, str]:
        """
        Air 모델을 동적으로 재로드합니다.

        Args:
            new_cfg: 새로운 설정 (None이면 기존 설정 사용)

        Returns:
            결과 메시지
        """
        async with self._lock:
            try:
                self.logger("Starting air model reload...")

                # 설정 업데이트
                if new_cfg:
                    self.cfg = new_cfg

                # 기존 inference 삭제 (메모리 해제)
                old_inference = self.air_inference
                del old_inference

                # 새로운 inference 생성
                self.air_inference = AirInference(self.model_loader, self.cfg)

                # Process의 inference 업데이트
                if self.air_process:
                    self.air_process.inference = self.air_inference

                self.logger("Air model reloaded successfully")

                return {
                    "status": "success",
                    "message": "Air model reloaded successfully",
                    "model": self.model_loader.get_pose_name()
                }

            except Exception as e:
                self.logger.error(f"Failed to reload air model: {e}")
                return {
                    "status": "error",
                    "message": f"Failed to reload air model: {str(e)}"
                }

    async def reload_all_models(self, new_cfg=None) -> Dict[str, Any]:
        """모든 모델을 재로드합니다"""
        results = {
            "side": await self.reload_side_model(new_cfg),
            "air": await self.reload_air_model(new_cfg)
        }

        overall_status = "success" if all(
            r["status"] == "success" for r in results.values()
        ) else "partial" if any(
            r["status"] == "success" for r in results.values()
        ) else "error"

        return {
            "status": overall_status,
            "results": results
        }

    def get_process_stats(self) -> Dict[str, Any]:
        """프로세스 상태 정보 반환"""
        stats = {}

        if self.side_process:
            stats["side"] = {
                "queue_size": self.side_process.queue.qsize() if hasattr(self.side_process, 'queue') else 0,
                "result_queue_size": self.side_process.result_queue.qsize() if hasattr(self.side_process, 'result_queue') else 0,
            }

        if self.air_process:
            stats["air"] = {
                "queue_size": self.air_process.queue.qsize() if hasattr(self.air_process, 'queue') else 0,
                "result_queue_size": self.air_process.result_queue.qsize() if hasattr(self.air_process, 'result_queue') else 0,
            }

        return stats


# 전역 인스턴스
_model_manager = None


def get_model_manager() -> ModelManager:
    """ModelManager 싱글톤 인스턴스 반환"""
    global _model_manager
    if _model_manager is None:
        _model_manager = ModelManager()
    return _model_manager


def setup_model_manager(
    model_loader,
    side_inference,
    air_inference,
    side_process,
    air_process,
    cfg,
    logger,
    mqtt
):
    """ModelManager 설정"""
    manager = get_model_manager()
    manager.setup(
        model_loader,
        side_inference,
        air_inference,
        side_process,
        air_process,
        cfg,
        logger,
        mqtt
    )
    return manager
