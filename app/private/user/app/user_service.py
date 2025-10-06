from datetime import datetime
from typing import Annotated

from dependency_injector.wiring import inject, Provide
from fastapi import Depends, HTTPException
from ulid import ULID

from user.domain.repository.user_repo import IUserRepository
from user.domain.user import User
from user.infra.repository.user_repo import UserRepository

from containers import Container

class UserService:
    
    @inject
    def __init__(self,
                 user_repo = Annotated[IUserRepository, Depends(
                     Provide[Container.user_repo])]):
        self.user_repo = user_repo
        self.ulid = ULID()
    
    def create_user(self, name, password):
        
        try:
            _user = self.user_repo.find_by_name(name)
        except HTTPException as e:
            if e.status_code != 422:
                raise e
        
        if _user:
            raise HTTPException(status_code=422)
        
        now = datetime.now()
        user: User = User(
            id=self.ulid.generate(),
            name=name,
            password=password,
            db_status=True,
            created_at=now,
            updated_at=now,
        )
        self.user_repo.save(user)
    
    def update_user(self, user_id: str, name: str | None = None, password: str | None=None):
        user = self.user_repo.find_by_id(user_id)
        
        if name:
            user.name = name
        if password:
            user.password = password
        
        user.updated_at = datetime.now()
        self.user_repo.update(user)
        
        return user
    
    def get_users(self) -> list[User]:
        return self.user_repo.get_users()