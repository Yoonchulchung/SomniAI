"""
Auth Data Transfer Objects
"""
from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    """로그인 요청 DTO"""

    name: str = Field(..., min_length=2, max_length=50)
    password: str = Field(..., min_length=4)


class LoginResponse(BaseModel):
    """로그인 응답 DTO"""

    access_token: str
    token_type: str = "bearer"
    user_id: str
    name: str


class RegisterRequest(BaseModel):
    """회원가입 요청 DTO"""

    name: str = Field(..., min_length=2, max_length=50)
    password: str = Field(..., min_length=4)


class RegisterResponse(BaseModel):
    """회원가입 응답 DTO"""

    message: str = "User created successfully"


class UserInfoResponse(BaseModel):
    """사용자 정보 응답 DTO"""

    user_id: str
    name: str
    created_at: str
