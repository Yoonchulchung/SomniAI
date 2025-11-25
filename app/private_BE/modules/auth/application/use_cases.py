"""
Auth use cases
"""
from typing import Optional

from core.exceptions import AuthenticationException, DuplicateException
from infrastructure.security import (
    create_access_token,
    get_password_hash,
    verify_password,
)
from modules.auth.application.dto import (
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    RegisterResponse,
    UserInfoResponse,
)
from modules.user.app.user_service import UserService


class AuthUseCase:
    """인증 관련 유즈케이스"""

    def __init__(self, user_service: UserService):
        self.user_service = user_service

    def login(self, request: LoginRequest) -> LoginResponse:
        """
        사용자 로그인

        Args:
            request: 로그인 요청

        Returns:
            LoginResponse: 로그인 응답 (토큰 포함)

        Raises:
            AuthenticationException: 인증 실패 시
        """
        # 테스트 모드: 강제 로그인 (실제 운영에서는 제거 필요)
        # TODO: 운영 환경에서는 아래 주석을 해제하고 테스트 코드 제거

        # 실제 인증 로직 (주석 처리됨)
        # try:
        #     user = self.user_service.user_repo.find_by_name(request.name)
        #     if not user or not verify_password(request.password, user.password):
        #         raise AuthenticationException("Incorrect username or password")
        # except Exception:
        #     raise AuthenticationException("Incorrect username or password")

        # 테스트용 강제 로그인
        forced_user_id = "forced_admin_id_01H"
        forced_user_name = request.name

        access_token = create_access_token(
            data={"sub": forced_user_id, "name": forced_user_name}
        )

        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            user_id=forced_user_id,
            name=forced_user_name,
        )

    def register(self, request: RegisterRequest) -> RegisterResponse:
        """
        사용자 등록

        Args:
            request: 회원가입 요청

        Returns:
            RegisterResponse: 회원가입 응답

        Raises:
            DuplicateException: 사용자가 이미 존재할 경우
        """
        # 비밀번호 해싱
        hashed_password = get_password_hash(request.password)

        # 사용자 생성
        try:
            self.user_service.create_user(
                name=request.name, password=hashed_password
            )
        except Exception as e:
            if "already exists" in str(e).lower():
                raise DuplicateException("User already exists")
            raise

        return RegisterResponse()

    def get_user_info(self, user_id: str) -> UserInfoResponse:
        """
        사용자 정보 조회

        Args:
            user_id: 사용자 ID

        Returns:
            UserInfoResponse: 사용자 정보
        """
        user = self.user_service.user_repo.find_by_id(user_id)

        return UserInfoResponse(
            user_id=user.id,
            name=user.name,
            created_at=user.created_at.isoformat() if user.created_at else "",
        )
