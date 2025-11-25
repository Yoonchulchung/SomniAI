"""
Model Control API
런타임에 모델을 동적으로 변경하고 관리하는 API
"""
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from modules.inference.application.model_manager import get_model_manager

router = APIRouter()


class ModelReloadRequest(BaseModel):
    """모델 재로드 요청"""
    model_type: str  # "side", "air", "all"
    config_path: Optional[str] = None


class ModelInfoResponse(BaseModel):
    """모델 정보 응답"""
    pose_model: Optional[str]
    vlm_model: Optional[str]
    available_models: list
    device: str


@router.get("/model/info")
async def get_model_info() -> Dict[str, Any]:
    """
    현재 로드된 모델 정보 조회

    Returns:
        모델 정보 (pose 모델, VLM 모델, 사용 가능한 모델 목록 등)
    """
    manager = get_model_manager()

    if not manager.initialized:
        raise HTTPException(status_code=503, detail="Model manager not initialized")

    return manager.get_model_info()


@router.get("/model/stats")
async def get_process_stats() -> Dict[str, Any]:
    """
    프로세스 상태 정보 조회

    Returns:
        큐 크기 등 프로세스 통계
    """
    manager = get_model_manager()

    if not manager.initialized:
        raise HTTPException(status_code=503, detail="Model manager not initialized")

    return manager.get_process_stats()


@router.post("/model/reload")
async def reload_model(request: ModelReloadRequest) -> Dict[str, Any]:
    """
    모델을 동적으로 재로드

    Args:
        request: 재로드 요청 (모델 타입, 설정 경로)

    Returns:
        재로드 결과
    """
    manager = get_model_manager()

    if not manager.initialized:
        raise HTTPException(status_code=503, detail="Model manager not initialized")

    # 설정 로드 (필요시)
    new_cfg = None
    if request.config_path:
        try:
            from inference.application.config import load_config
            new_cfg = load_config(request.config_path)
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to load config from {request.config_path}: {str(e)}"
            )

    # 모델 재로드
    if request.model_type == "side":
        result = await manager.reload_side_model(new_cfg)
    elif request.model_type == "air":
        result = await manager.reload_air_model(new_cfg)
    elif request.model_type == "all":
        result = await manager.reload_all_models(new_cfg)
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid model_type: {request.model_type}. Must be 'side', 'air', or 'all'"
        )

    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result.get("message", "Unknown error"))

    return result


@router.post("/model/reload/side")
async def reload_side_model() -> Dict[str, Any]:
    """
    Side 모델만 재로드 (간편 API)

    Returns:
        재로드 결과
    """
    manager = get_model_manager()

    if not manager.initialized:
        raise HTTPException(status_code=503, detail="Model manager not initialized")

    result = await manager.reload_side_model()

    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result.get("message", "Unknown error"))

    return result


@router.post("/model/reload/air")
async def reload_air_model() -> Dict[str, Any]:
    """
    Air 모델만 재로드 (간편 API)

    Returns:
        재로드 결과
    """
    manager = get_model_manager()

    if not manager.initialized:
        raise HTTPException(status_code=503, detail="Model manager not initialized")

    result = await manager.reload_air_model()

    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result.get("message", "Unknown error"))

    return result


@router.post("/model/reload/all")
async def reload_all_models() -> Dict[str, Any]:
    """
    모든 모델 재로드 (간편 API)

    Returns:
        재로드 결과
    """
    manager = get_model_manager()

    if not manager.initialized:
        raise HTTPException(status_code=503, detail="Model manager not initialized")

    result = await manager.reload_all_models()

    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result.get("message", "Unknown error"))

    return result
