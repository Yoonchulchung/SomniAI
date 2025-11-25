"""
API Log API Router
"""
from typing import Optional

from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, Query

from containers import Container
from modules.api_log.application.dto import APILogListResponse, StatsResponse
from modules.api_log.application.use_cases import APILogUseCase

router = APIRouter(prefix="/api-logs", tags=["logs"])


@router.get("", response_model=APILogListResponse)
@inject
async def get_api_logs(
    page: int = Query(1, ge=1, description="페이지 번호"),
    items_per_page: int = Query(20, ge=1, le=100, description="페이지당 항목 수"),
    user_id: Optional[str] = Query(None, description="사용자 ID 필터"),
    endpoint: Optional[str] = Query(None, description="엔드포인트 필터"),
    method: Optional[str] = Query(None, description="HTTP 메소드 필터"),
    status_code: Optional[int] = Query(None, description="상태 코드 필터"),
    use_case: APILogUseCase = Depends(Provide[Container.api_log_use_case]),
) -> APILogListResponse:
    """
    API 로그 목록 조회

    - **page**: 페이지 번호 (기본값: 1)
    - **items_per_page**: 페이지당 항목 수 (기본값: 20, 최대: 100)
    - **user_id**: 특정 사용자의 로그만 필터링
    - **endpoint**: 특정 엔드포인트의 로그만 필터링
    - **method**: 특정 HTTP 메소드의 로그만 필터링
    - **status_code**: 특정 상태 코드의 로그만 필터링
    """
    return use_case.get_logs(
        page=page,
        items_per_page=items_per_page,
        user_id=user_id,
        endpoint=endpoint,
        method=method,
        status_code=status_code,
    )


@router.get("/{log_id}")
@inject
async def get_api_log_detail(
    log_id: str,
    use_case: APILogUseCase = Depends(Provide[Container.api_log_use_case]),
) -> dict:
    """
    특정 API 로그의 상세 정보 조회 (요청/응답 본문 포함)

    - **log_id**: 로그 ID
    """
    return use_case.get_log_detail(log_id)


@router.get("/stats/summary", response_model=StatsResponse)
@inject
async def get_api_logs_stats(
    user_id: Optional[str] = Query(None, description="사용자 ID 필터"),
    use_case: APILogUseCase = Depends(Provide[Container.api_log_use_case]),
) -> StatsResponse:
    """
    API 로그 통계 조회

    - **user_id**: 특정 사용자의 통계만 조회
    """
    return use_case.get_stats(user_id=user_id)
