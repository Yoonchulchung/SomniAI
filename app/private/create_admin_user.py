"""
관리자 사용자 생성 스크립트
"""
import sys
from datetime import datetime
from ulid import ULID
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext

from user.infra.db_models.user import User

# 비밀번호 해싱
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# DB 연결 (alembic.ini에서 가져온 연결 문자열)
DATABASE_URL = "mysql+mysqldb://root:local-root-pass@127.0.0.1/somniai"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def create_admin_user(name: str, password: str):
    """관리자 사용자 생성"""
    db = SessionLocal()
    try:
        # 이미 존재하는지 확인
        existing_user = db.query(User).filter(User.name == name).first()
        if existing_user:
            print(f"사용자 '{name}'이(가) 이미 존재합니다.")
            return

        # 비밀번호 해싱
        hashed_password = pwd_context.hash(password)

        # 사용자 생성
        ulid = ULID()
        now = datetime.now()
        user = User(
            id=ulid.generate(),
            name=name,
            password=hashed_password,
            db_status=True,
            created_at=now,
            updated_at=now,
        )

        db.add(user)
        db.commit()
        print(f"관리자 사용자 '{name}'이(가) 생성되었습니다.")

    except Exception as e:
        db.rollback()
        print(f"사용자 생성 실패: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("사용법: python create_admin_user.py <사용자명> <비밀번호>")
        sys.exit(1)

    username = sys.argv[1]
    password = sys.argv[2]

    create_admin_user(username, password)
