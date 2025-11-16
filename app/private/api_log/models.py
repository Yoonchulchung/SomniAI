"""
API 요청/응답 로깅 모델
"""
from datetime import datetime
from sqlalchemy import DateTime, String, Text, Integer
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class APILog(Base):
    """API 요청/응답 로그"""
    __tablename__ = "api_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(36), nullable=True, index=True)
    endpoint: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    method: Mapped[str] = mapped_column(String(10), nullable=False)
    status_code: Mapped[int] = mapped_column(Integer, nullable=False)
    request_body: Mapped[str] = mapped_column(Text, nullable=True)
    response_body: Mapped[str] = mapped_column(Text, nullable=True)
    ip_address: Mapped[str] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str] = mapped_column(String(500), nullable=True)
    duration_ms: Mapped[int] = mapped_column(Integer, nullable=True)  # 요청 처리 시간 (밀리초)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
