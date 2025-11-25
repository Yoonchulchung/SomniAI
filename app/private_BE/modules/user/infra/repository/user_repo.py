from fastapi import HTTPException

from infrastructure.database.db_utils import row_to_dict
from infrastructure.database.session import SessionLocal
from modules.user.domain.repository.user_repo import IUserRepository
from modules.user.domain.user import User as UserV0
from modules.user.infra.db_models.user import User


class UserRepository(IUserRepository):
    
    def save(self, user: UserV0):
        new_user = User(
            id=user.id,
            name=user.name,
            email=user.email,
            password=user.password,
            created_at=user.created_at,
            updated_at=user.updated_at,
        )
        
        try:
            with SessionLocal() as db:
                db = SessionLocal()
                db.add(new_user)
                db.commit()
        finally:
            db.close()
            
    def find_by_email(self, email: str) -> User:
        
        with SessionLocal() as db:
            user = db.query(User).filter(User.email == email).first()
        
        if not user:
            raise HTTPException(status_code=422)

        return UserV0(**row_to_dict(user))
    
    def update(self, user_vo: UserV0):
        with SessionLocal() as db:
            user = db.query(User).filter(User.id == user_vo.id).first()
        
            if not user:
                raise HTTPException(status_code=422)

            user.name=user_vo.name
            user.password = user_vo.password
            
            db.add(user)
            db.commit()
        
        return user
    
    def get_users(self) -> list[UserV0]:
        with SessionLocal() as db:
            users = db.query(User).all()
        
        return[UserV0(**row_to_dict(user)) for user in users]   