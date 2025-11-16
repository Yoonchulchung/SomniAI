"""
API Log domain entities
"""
from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class APILogEntity:
    """API 로그 도메인 엔티티"""

    id: str
    user_id: Optional[str]
    endpoint: str
    method: str
    status_code: int
    request_body: Optional[str]
    response_body: Optional[str]
    ip_address: Optional[str]
    user_agent: Optional[str]
    duration_ms: Optional[int]
    created_at: datetime
