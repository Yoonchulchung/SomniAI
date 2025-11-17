"""
API Log DTOs
"""
from typing import Optional, List
from pydantic import BaseModel, Field


class APILogResponse(BaseModel):
    """API 로그 응답 DTO"""

    id: str
    user_id: Optional[str]
    endpoint: str
    method: str
    status_code: int
    ip_address: Optional[str]
    user_agent: Optional[str]
    duration_ms: Optional[int]
    created_at: str


class APILogDetailResponse(APILogResponse):
    """API 로그 상세 응답 DTO"""

    request_body: Optional[str]
    response_body: Optional[str]


class PaginationInfo(BaseModel):
    """페이지네이션 정보"""

    page: int
    items_per_page: int
    total: int
    total_pages: int


class APILogListResponse(BaseModel):
    """API 로그 목록 응답"""

    success: bool = True
    data: dict


class StatsResponse(BaseModel):
    """통계 응답 DTO"""

    success: bool = True
    data: dict
