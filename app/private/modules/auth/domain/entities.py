"""
Auth domain entities
"""
from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class AuthUser:
    """인증 사용자 도메인 엔티티"""

    id: str
    name: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    def __post_init__(self):
        """검증 로직"""
        if not self.name or len(self.name) < 2:
            raise ValueError("Name must be at least 2 characters")
