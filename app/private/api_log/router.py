"""
API 로그 조회 라우터
"""
from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from database import SessionLocal
from api_log.models import APILog

router = APIRouter()


def get_db():
    """데이터베이스 세션 의존성"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/api-logs")
async def get_api_logs(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1, description="페이지 번호"),
    items_per_page: int = Query(20, ge=1, le=100, description="페이지당 항목 수"),
    user_id: Optional[str] = Query(None, description="사용자 ID 필터"),
    endpoint: Optional[str] = Query(None, description="엔드포인트 필터"),
    method: Optional[str] = Query(None, description="HTTP 메소드 필터"),
    status_code: Optional[int] = Query(None, description="상태 코드 필터"),
):
    """
    API 로그 목록을 조회합니다.

    - **page**: 페이지 번호 (기본값: 1)
    - **items_per_page**: 페이지당 항목 수 (기본값: 20, 최대: 100)
    - **user_id**: 특정 사용자의 로그만 필터링
    - **endpoint**: 특정 엔드포인트의 로그만 필터링
    - **method**: 특정 HTTP 메소드의 로그만 필터링 (GET, POST 등)
    - **status_code**: 특정 상태 코드의 로그만 필터링
    """
    query = db.query(APILog)

    # 필터 적용
    if user_id:
        query = query.filter(APILog.user_id == user_id)
    if endpoint:
        query = query.filter(APILog.endpoint.like(f"%{endpoint}%"))
    if method:
        query = query.filter(APILog.method == method.upper())
    if status_code:
        query = query.filter(APILog.status_code == status_code)

    # 전체 개수 조회
    total = query.count()

    # 페이지네이션 적용
    offset = (page - 1) * items_per_page
    logs = query.order_by(desc(APILog.created_at)).offset(offset).limit(items_per_page).all()

    # 결과 변환
    log_list = []
    for log in logs:
        log_list.append({
            "id": log.id,
            "user_id": log.user_id,
            "endpoint": log.endpoint,
            "method": log.method,
            "status_code": log.status_code,
            "ip_address": log.ip_address,
            "user_agent": log.user_agent,
            "duration_ms": log.duration_ms,
            "created_at": log.created_at.isoformat() if log.created_at else None,
            # 요청/응답 본문은 크기가 클 수 있으므로 기본적으로 제외
        })

    return {
        "success": True,
        "data": {
            "logs": log_list,
            "pagination": {
                "page": page,
                "items_per_page": items_per_page,
                "total": total,
                "total_pages": (total + items_per_page - 1) // items_per_page
            }
        }
    }


@router.get("/api-logs/{log_id}")
async def get_api_log_detail(
    log_id: str,
    db: Session = Depends(get_db)
):
    """
    특정 API 로그의 상세 정보를 조회합니다 (요청/응답 본문 포함).

    - **log_id**: 로그 ID
    """
    log = db.query(APILog).filter(APILog.id == log_id).first()

    if not log:
        return {
            "success": False,
            "message": f"로그를 찾을 수 없습니다: {log_id}",
            "data": None
        }

    return {
        "success": True,
        "data": {
            "id": log.id,
            "user_id": log.user_id,
            "endpoint": log.endpoint,
            "method": log.method,
            "status_code": log.status_code,
            "request_body": log.request_body,
            "response_body": log.response_body,
            "ip_address": log.ip_address,
            "user_agent": log.user_agent,
            "duration_ms": log.duration_ms,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
    }


@router.get("/api-logs/stats/summary")
async def get_api_logs_stats(
    db: Session = Depends(get_db),
    user_id: Optional[str] = Query(None, description="사용자 ID 필터"),
):
    """
    API 로그 통계를 조회합니다.

    - **user_id**: 특정 사용자의 통계만 조회
    """
    from sqlalchemy import func

    query = db.query(APILog)

    if user_id:
        query = query.filter(APILog.user_id == user_id)

    total_requests = query.count()

    # 상태 코드별 통계
    status_stats = db.query(
        APILog.status_code,
        func.count(APILog.id).label('count')
    )

    if user_id:
        status_stats = status_stats.filter(APILog.user_id == user_id)

    status_stats = status_stats.group_by(APILog.status_code).all()

    # 엔드포인트별 통계
    endpoint_stats = db.query(
        APILog.endpoint,
        func.count(APILog.id).label('count')
    )

    if user_id:
        endpoint_stats = endpoint_stats.filter(APILog.user_id == user_id)

    endpoint_stats = endpoint_stats.group_by(APILog.endpoint).order_by(desc('count')).limit(10).all()

    # 평균 응답 시간
    avg_duration = db.query(func.avg(APILog.duration_ms)).filter(APILog.duration_ms.isnot(None))

    if user_id:
        avg_duration = avg_duration.filter(APILog.user_id == user_id)

    avg_duration = avg_duration.scalar()

    return {
        "success": True,
        "data": {
            "total_requests": total_requests,
            "average_duration_ms": round(avg_duration, 2) if avg_duration else 0,
            "status_code_distribution": [
                {"status_code": stat.status_code, "count": stat.count}
                for stat in status_stats
            ],
            "top_endpoints": [
                {"endpoint": stat.endpoint, "count": stat.count}
                for stat in endpoint_stats
            ]
        }
    }
