from datetime import datetime
from typing import Annotated

from fastapi import HTTPException
from ulid import ULID

from modules.user.domain.repository.user_repo import IUserRepository
from modules.user.domain.user import User


class UserService:
    
    def __init__(self, user_repo: IUserRepository):
        self.user_repo = user_repo
    
    def create_user(self, name, password):
        
    
        try:
            existing_user = self.user_repo.find_by_name(name)
            if existing_user:
                 raise HTTPException(status_code=400, detail="User already exists")
        except HTTPException as e:
            if e.status_code == 422: 
                pass
            else:
                raise e
        
        now = datetime.now()
        
        new_user_id = str(ULID())
        
        user = User(
            id=new_user_id,
            name=name,
            password=password,
            db_status=True,
            created_at=now,
            updated_at=now,
        )
        
        self.user_repo.save(user)
        return user
    
    def update_user(self, user_id: str, name: str | None = None, password: str | None=None):
        user = self.user_repo.find_by_id(user_id)
        
        if name:
            user.name = name
        if password:
            user.password = password
        
        user.updated_at = datetime.now()
        
        updated_user = self.user_repo.update(user)
        
        return updated_user
    
    def get_users(self) -> list[User]:
        return self.user_repo.get_users()