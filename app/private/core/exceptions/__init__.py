"""
Custom exceptions
"""
from core.exceptions.base import (
    SomniAIException,
    DatabaseException,
    AuthenticationException,
    AuthorizationException,
    NotFoundException,
    ValidationException,
    DuplicateException,
)

__all__ = [
    "SomniAIException",
    "DatabaseException",
    "AuthenticationException",
    "AuthorizationException",
    "NotFoundException",
    "ValidationException",
    "DuplicateException",
]
