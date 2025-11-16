"""
인증 API 라우터
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from dependency_injector.wiring import inject, Provide

from auth.jwt_handler import verify_password, create_access_token, get_password_hash
from containers import Container
from user.app.user_service import UserService

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    name: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    name: str


class RegisterRequest(BaseModel):
    name: str
    password: str


# @router.post("/login", response_model=LoginResponse)
# @inject
# async def login(
#     request: LoginRequest,
#     user_service: UserService = Depends(Provide[Container.user_service])
# ):
#     """
#     사용자 로그인
#     """
#     # 사용자 조회
#     try:
#         user = user_service.user_repo.find_by_name(request.name)
#     except HTTPException:
#         raise HTTPException(
#             status_code=status.HTTP_401_UNAUTHORIZED,
#             detail="Incorrect username or password",
#         )

#     if not user:
#         raise HTTPException(
#             status_code=status.HTTP_401_UNAUTHORIZED,
#             detail="Incorrect username or password",
#         )

#     # 비밀번호 검증
#     if not verify_password(request.password, user.password):
#         raise HTTPException(
#             status_code=status.HTTP_401_UNAUTHORIZED,
#             detail="Incorrect username or password",
#         )

#     # JWT 토큰 생성
#     access_token = create_access_token(
#         data={"sub": user.id, "name": user.name}
#     )

#     return LoginResponse(
#         access_token=access_token,
#         token_type="bearer",
#         user_id=user.id,
#         name=user.name
#     )

@router.post("/login", response_model=LoginResponse)
@inject
async def login(
    request: LoginRequest,
    user_service: UserService = Depends(Provide[Container.user_service])
):
    """
    [테스트용] 무조건 로그인 성공 처리 (강제 할당)
    """
    
    forced_user_id = "forced_admin_id_01H" 
    forced_user_name = request.name

    access_token = create_access_token(
        data={"sub": forced_user_id, "name": forced_user_name}
    )

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user_id=forced_user_id,
        name=forced_user_name
    )


@router.post("/register", status_code=status.HTTP_201_CREATED)
@inject
async def register(
    request: RegisterRequest,
    user_service: UserService = Depends(Provide[Container.user_service])
):
    """
    사용자 등록
    """
    # 비밀번호 해싱
    hashed_password = get_password_hash(request.password)

    # 사용자 생성
    try:
        user_service.create_user(
            name=request.name,
            password=hashed_password
        )
    except HTTPException as e:
        if e.status_code == 422:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User already exists"
            )
        raise e

    return {"message": "User created successfully"}


@router.get("/me")
@inject
async def get_me(
    user_service: UserService = Depends(Provide[Container.user_service]),
    current_user: dict = Depends(Provide[Container.current_user])
):
    """
    현재 로그인한 사용자 정보 조회
    """
    user = user_service.user_repo.find_by_id(current_user["user_id"])

    return {
        "user_id": user.id,
        "name": user.name,
        "created_at": user.created_at,
    }
