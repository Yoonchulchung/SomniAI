"""
API Log repository interface
"""
from abc import ABC, abstractmethod
from typing import Optional, List, Tuple

from modules.api_log.domain.entities import APILogEntity


class APILogRepository(ABC):
    """API 로그 리포지토리 인터페이스"""

    @abstractmethod
    def find_all(
        self,
        page: int,
        items_per_page: int,
        user_id: Optional[str] = None,
        endpoint: Optional[str] = None,
        method: Optional[str] = None,
        status_code: Optional[int] = None,
    ) -> Tuple[List[APILogEntity], int]:
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
            Tuple[List[APILogEntity], int]: (로그 목록, 전체 개수)
        """
        pass

    @abstractmethod
    def find_by_id(self, log_id: str) -> Optional[APILogEntity]:
        """
        로그 상세 조회

        Args:
            log_id: 로그 ID

        Returns:
            Optional[APILogEntity]: 로그 엔티티
        """
        pass

    @abstractmethod
    def get_stats(self, user_id: Optional[str] = None) -> dict:
        """
        통계 조회

        Args:
            user_id: 사용자 ID 필터

        Returns:
            dict: 통계 정보
        """
        pass
