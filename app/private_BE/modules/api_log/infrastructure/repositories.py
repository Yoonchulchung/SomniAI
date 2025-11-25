"""
API Log repository implementation
"""
from typing import List, Optional, Tuple

from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from modules.api_log.domain.entities import APILogEntity
from modules.api_log.domain.repositories import APILogRepository
from modules.api_log.infrastructure.models import APILog


class SQLAlchemyAPILogRepository(APILogRepository):
    """SQLAlchemy 기반 API 로그 리포지토리"""

    def __init__(self, db: Session):
        self.db = db

    def find_all(
        self,
        page: int,
        items_per_page: int,
        user_id: Optional[str] = None,
        endpoint: Optional[str] = None,
        method: Optional[str] = None,
        status_code: Optional[int] = None,
    ) -> Tuple[List[APILogEntity], int]:
        """로그 목록 조회"""
        query = self.db.query(APILog)

        # 필터 적용
        if user_id:
            query = query.filter(APILog.user_id == user_id)
        if endpoint:
            query = query.filter(APILog.endpoint.like(f"%{endpoint}%"))
        if method:
            query = query.filter(APILog.method == method.upper())
        if status_code:
            query = query.filter(APILog.status_code == status_code)

        # 전체 개수
        total = query.count()

        # 페이지네이션
        offset = (page - 1) * items_per_page
        logs = (
            query.order_by(desc(APILog.created_at))
            .offset(offset)
            .limit(items_per_page)
            .all()
        )

        # 엔티티로 변환
        entities = [self._to_entity(log) for log in logs]

        return entities, total

    def find_by_id(self, log_id: str) -> Optional[APILogEntity]:
        """로그 상세 조회"""
        log = self.db.query(APILog).filter(APILog.id == log_id).first()

        if not log:
            return None

        return self._to_entity(log)

    def get_stats(self, user_id: Optional[str] = None) -> dict:
        """통계 조회"""
        query = self.db.query(APILog)

        if user_id:
            query = query.filter(APILog.user_id == user_id)

        total_requests = query.count()

        # 상태 코드별 통계
        status_stats = self.db.query(
            APILog.status_code, func.count(APILog.id).label("count")
        )

        if user_id:
            status_stats = status_stats.filter(APILog.user_id == user_id)

        status_stats = status_stats.group_by(APILog.status_code).all()

        # 엔드포인트별 통계
        endpoint_stats = self.db.query(
            APILog.endpoint, func.count(APILog.id).label("count")
        )

        if user_id:
            endpoint_stats = endpoint_stats.filter(APILog.user_id == user_id)

        endpoint_stats = (
            endpoint_stats.group_by(APILog.endpoint)
            .order_by(desc("count"))
            .limit(10)
            .all()
        )

        # 평균 응답 시간
        avg_duration = self.db.query(func.avg(APILog.duration_ms)).filter(
            APILog.duration_ms.isnot(None)
        )

        if user_id:
            avg_duration = avg_duration.filter(APILog.user_id == user_id)

        avg_duration = avg_duration.scalar()

        return {
            "total_requests": total_requests,
            "average_duration_ms": round(avg_duration, 2) if avg_duration else 0,
            "status_code_distribution": [
                {"status_code": stat.status_code, "count": stat.count}
                for stat in status_stats
            ],
            "top_endpoints": [
                {"endpoint": stat.endpoint, "count": stat.count}
                for stat in endpoint_stats
            ],
        }

    def _to_entity(self, model: APILog) -> APILogEntity:
        """모델을 엔티티로 변환"""
        return APILogEntity(
            id=model.id,
            user_id=model.user_id,
            endpoint=model.endpoint,
            method=model.method,
            status_code=model.status_code,
            request_body=model.request_body,
            response_body=model.response_body,
            ip_address=model.ip_address,
            user_agent=model.user_agent,
            duration_ms=model.duration_ms,
            created_at=model.created_at,
        )
