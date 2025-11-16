def row_to_dict(row) -> dict:
    """
    SQLAlchemy 모델 인스턴스를 Python dictionary로 변환합니다.
    """
    if row is None:
        return None
    
    # 모델의 __table__ 속성에서 컬럼 이름들을 가져와 딕셔너리로 만듭니다.
    return {c.name: getattr(row, c.name) for c in row.__table__.columns}