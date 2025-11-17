"""
Base exception classes
"""


class SomniAIException(Exception):
    """Base exception for SomniAI application"""

    def __init__(self, message: str = "An error occurred", status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class DatabaseException(SomniAIException):
    """Database related exceptions"""

    def __init__(self, message: str = "Database error"):
        super().__init__(message, status_code=500)


class AuthenticationException(SomniAIException):
    """Authentication related exceptions"""

    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message, status_code=401)


class AuthorizationException(SomniAIException):
    """Authorization related exceptions"""

    def __init__(self, message: str = "Access denied"):
        super().__init__(message, status_code=403)


class NotFoundException(SomniAIException):
    """Resource not found exceptions"""

    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, status_code=404)


class ValidationException(SomniAIException):
    """Validation related exceptions"""

    def __init__(self, message: str = "Validation failed"):
        super().__init__(message, status_code=422)


class DuplicateException(SomniAIException):
    """Duplicate resource exceptions"""

    def __init__(self, message: str = "Resource already exists"):
        super().__init__(message, status_code=409)
