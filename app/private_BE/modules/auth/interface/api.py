"""
Auth API Router
"""
from fastapi import APIRouter, Depends, HTTPException, status
from dependency_injector.wiring import inject, Provide

from modules.auth.application.use_cases import AuthUseCase
from modules.auth.application.dto import (
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    RegisterResponse,
    UserInfoResponse,
)
from modules.auth.infrastructure.dependencies import get_current_user
from containers import Container

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
@inject
async def login(
    request: LoginRequest,
    auth_use_case: AuthUseCase = Depends(Provide[Container.auth_use_case]),
) -> LoginResponse:
    """
    사용자 로그인

    Args:
        request: 로그인 요청

    Returns:
        LoginResponse: 액세스 토큰 및 사용자 정보
    """
    try:
        return auth_use_case.login(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
@inject
async def register(
    request: RegisterRequest,
    auth_use_case: AuthUseCase = Depends(Provide[Container.auth_use_case]),
) -> RegisterResponse:
    """
    사용자 등록

    Args:
        request: 회원가입 요청

    Returns:
        RegisterResponse: 등록 완료 메시지
    """
    try:
        return auth_use_case.register(request)
    except Exception as e:
        status_code = getattr(e, "status_code", status.HTTP_400_BAD_REQUEST)
        raise HTTPException(status_code=status_code, detail=str(e))


@router.get("/me", response_model=UserInfoResponse)
@inject
async def get_me(
    current_user: dict = Depends(get_current_user),
    auth_use_case: AuthUseCase = Depends(Provide[Container.auth_use_case]),
) -> UserInfoResponse:
    """
    현재 로그인한 사용자 정보 조회

    Args:
        current_user: 현재 사용자 (의존성 주입)
        auth_use_case: 인증 유즈케이스 (의존성 주입)

    Returns:
        UserInfoResponse: 사용자 정보
    """
    try:
        return auth_use_case.get_user_info(current_user["user_id"])
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
