from dependency_injector import containers, providers

from user.infra.repository.user_repo import UserRepository
from user.app.user_service import UserService
from auth.dependencies import get_current_user

class Container(containers.DeclarativeContainer):
    wiring_config = containers.WiringConfiguration(
        packages=["user"],
    )
    
    user_repo=providers.Factory(UserRepository)
    user_service = providers.Factory(UserService, user_repo=user_repo)
    current_user = providers.Callable(get_current_user)