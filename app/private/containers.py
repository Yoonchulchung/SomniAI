"""
Dependency Injection Container
"""
from dependency_injector import containers, providers

from core.config import get_settings
from infrastructure.database import SessionLocal
from modules.user.infra.repository.user_repo import UserRepository
from modules.user.app.user_service import UserService
from modules.auth.application.use_cases import AuthUseCase
from modules.api_log.infrastructure.repositories import SQLAlchemyAPILogRepository
from modules.api_log.application.use_cases import APILogUseCase


class Container(containers.DeclarativeContainer):
    """애플리케이션 DI 컨테이너"""

    wiring_config = containers.WiringConfiguration(
        packages=[
            "modules.auth",
            "modules.api_log",
            "modules.user",
        ],
    )

    # Configuration
    config = providers.Singleton(get_settings)

    # Database
    db = providers.Factory(SessionLocal)

    # User Module
    user_repo = providers.Factory(UserRepository)
    user_service = providers.Factory(UserService, user_repo=user_repo)

    # Auth Module
    auth_use_case = providers.Factory(AuthUseCase, user_service=user_service)

    # API Log Module
    api_log_repo = providers.Factory(
        SQLAlchemyAPILogRepository,
        db=db,
    )
    api_log_use_case = providers.Factory(
        APILogUseCase,
        repository=api_log_repo,
    )