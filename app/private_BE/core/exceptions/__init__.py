"""
Custom exceptions
"""
from core.exceptions.base import (
    AuthenticationException,
    AuthorizationException,
    DatabaseException,
    DuplicateException,
    NotFoundException,
    SomniAIException,
    ValidationException,
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
