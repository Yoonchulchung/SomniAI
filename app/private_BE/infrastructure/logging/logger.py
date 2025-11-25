"""
Application logger
"""
import logging
import sys
from typing import Optional

from core.config import get_settings

settings = get_settings()


def get_logger(name: Optional[str] = None) -> logging.Logger:
    """
    애플리케이션 로거 생성

    Args:
        name: 로거 이름 (기본값: root logger)

    Returns:
        logging.Logger: 설정된 로거
    """
    logger = logging.getLogger(name or settings.APP_NAME)

    if not logger.handlers:
        # 로그 레벨 설정
        log_level = getattr(logging, settings.FASTAPI.LOG_LEVEL.upper(), logging.INFO)
        logger.setLevel(log_level)

        # 콘솔 핸들러
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(log_level)

        # 포맷터
        formatter = logging.Formatter(
            fmt="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        console_handler.setFormatter(formatter)

        logger.addHandler(console_handler)

    return logger
