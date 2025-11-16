"""
API Log use cases
"""
from typing import Optional

from modules.api_log.domain.repositories import APILogRepository
from modules.api_log.application.dto import (
    APILogResponse,
    APILogDetailResponse,
    APILogListResponse,
    StatsResponse,
    PaginationInfo,
)


class APILogUseCase:
    """API 로그 유즈케이스"""

    def __init__(self, repository: APILogRepository):
        self.repository = repository

    def get_logs(
        self,
        page: int,
        items_per_page: int,
        user_id: Optional[str] = None,
        endpoint: Optional[str] = None,
        method: Optional[str] = None,
        status_code: Optional[int] = None,
    ) -> APILogListResponse:
        """
        로그 목록 조회

        Args:
            page: 페이지 번호
            items_per_page: 페이지당 항목 수
            user_id: 사용자 ID 필터
            endpoint: 엔드포인트 필터
            method: HTTP 메소드 필터
            status_code: 상태 코드 필터

        Returns:
            APILogListResponse: 로그 목록 및 페이지네이션 정보
        """
        logs, total = self.repository.find_all(
            page=page,
            items_per_page=items_per_page,
            user_id=user_id,
            endpoint=endpoint,
            method=method,
            status_code=status_code,
        )

        log_list = [
            APILogResponse(
                id=log.id,
                user_id=log.user_id,
                endpoint=log.endpoint,
                method=log.method,
                status_code=log.status_code,
                ip_address=log.ip_address,
                user_agent=log.user_agent,
                duration_ms=log.duration_ms,
                created_at=log.created_at.isoformat() if log.created_at else "",
            )
            for log in logs
        ]

        pagination = PaginationInfo(
            page=page,
            items_per_page=items_per_page,
            total=total,
            total_pages=(total + items_per_page - 1) // items_per_page,
        )

        return APILogListResponse(
            success=True,
            data={
                "logs": [log.model_dump() for log in log_list],
                "pagination": pagination.model_dump(),
            },
        )

    def get_log_detail(self, log_id: str) -> dict:
        """
        로그 상세 조회

        Args:
            log_id: 로그 ID

        Returns:
            dict: 로그 상세 정보
        """
        log = self.repository.find_by_id(log_id)

        if not log:
            return {
                "success": False,
                "message": f"로그를 찾을 수 없습니다: {log_id}",
                "data": None,
            }

        detail = APILogDetailResponse(
            id=log.id,
            user_id=log.user_id,
            endpoint=log.endpoint,
            method=log.method,
            status_code=log.status_code,
            request_body=log.request_body,
            response_body=log.response_body,
            ip_address=log.ip_address,
            user_agent=log.user_agent,
            duration_ms=log.duration_ms,
            created_at=log.created_at.isoformat() if log.created_at else "",
        )

        return {"success": True, "data": detail.model_dump()}

    def get_stats(self, user_id: Optional[str] = None) -> StatsResponse:
        """
        통계 조회

        Args:
            user_id: 사용자 ID 필터

        Returns:
            StatsResponse: 통계 정보
        """
        stats = self.repository.get_stats(user_id=user_id)

        return StatsResponse(success=True, data=stats)
