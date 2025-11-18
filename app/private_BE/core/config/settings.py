"""
Application settings using Pydantic
"""
from functools import lru_cache
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """애플리케이션 설정"""

    # Application
    APP_NAME: str = "SomniAI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # FastAPI
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    API_PREFIX: str = "/api/v1"
    WORKERS: int = 1
    RELOAD: bool = True
    LOG_LEVEL: str = "info"

    # Database
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_USER: str = "root"
    DB_PASSWORD: str = "local-root-pass"
    DB_NAME: str = "somniai"
    DB_ECHO: bool = False

    # Security
    JWT_SECRET_KEY: str = "your-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # CORS
    CORS_ORIGINS: list[str] = ["*"]
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: list[str] = ["*"]
    CORS_ALLOW_HEADERS: list[str] = ["*"]

    # MQTT (기존 설정 유지)
    MQTT_ADDRESS: str = "localhost"
    MQTT_PORT: int = 1883
    MQTT_TOPIC: str = "somniai/pillow/esp32"

    # Kafka
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9093"
    KAFKA_TOPIC_AIR: str = "somniai-air-images"
    KAFKA_TOPIC_SIDE: str = "somniai-side-images"
    KAFKA_CONSUMER_GROUP: str = "somniai-consumer-group"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    @property
    def database_url(self) -> str:
        """데이터베이스 연결 URL 생성"""
        return f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"


@lru_cache
def get_settings() -> Settings:
    """싱글톤 패턴으로 설정 인스턴스 반환"""
    return Settings()
