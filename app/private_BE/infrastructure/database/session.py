"""
Database session management
"""
from typing import Generator
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import Pool

from core.config import get_settings

settings = get_settings()

# SQLAlchemy engine 생성
engine = create_engine(
    settings.database_url,
    echo=settings.DB_ECHO,
    pool_pre_ping=True,  # 연결 유효성 검사
    pool_recycle=3600,   # 1시간마다 연결 재활용
    pool_size=10,        # 연결 풀 크기
    max_overflow=20,     # 최대 오버플로우
)


# 연결 풀 설정 이벤트
@event.listens_for(Pool, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """데이터베이스 연결 시 설정"""
    pass


# Session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


def get_db() -> Generator[Session, None, None]:
    """
    데이터베이스 세션 의존성

    Yields:
        Session: SQLAlchemy 세션
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
