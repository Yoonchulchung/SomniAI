from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# [변경 전]
# SQLALCHEMY_DATABASE_URL = "mysql+mysqldb://root:local-root-pass@127.0.0.1/somniai"

# [변경 후] mysqldb -> pymysql 로 변경
SQLALCHEMY_DATABASE_URL = "mysql+pymysql://root:local-root-pass@127.0.0.1/somniai"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()