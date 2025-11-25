# SomniAI AI 서버

> Created by Yoonchul Chung

FastAPI 기반의 AI 추론 서비스 - Clean Architecture 패턴 적용

## 아키텍처 구조

```
app/private/
├── core/                          # 핵심 공유 레이어
│   ├── config/                    # 설정 관리 (Pydantic Settings)
│   ├── exceptions/                # 공통 예외 클래스
│   └── domain/                    # 공통 도메인 엔티티
│
├── infrastructure/                # 공유 인프라스트럭처
│   ├── database/                  # 데이터베이스 세션 관리
│   ├── security/                  # JWT, 비밀번호 해싱
│   ├── logging/                   # 로깅 설정
│   └── middleware/                # 미들웨어
│
├── modules/                       # 비즈니스 모듈
│   ├── auth/                      # 인증 모듈
│   │   ├── domain/               # 도메인 엔티티
│   │   ├── application/          # 유즈케이스
│   │   ├── infrastructure/       # DB, 외부 서비스
│   │   └── interface/            # API 컨트롤러
│   ├── api_log/                  # API 로그 모듈
│   ├── user/                      # 사용자 모듈
│   └── inference/                 # AI 추론 모듈
│
├── containers.py                  # Dependency Injection 컨테이너
├── main.py                       # FastAPI 엔트리포인트
└── boot_loader.py                # 애플리케이션 부트스트랩
```


## 필수 요구사항
- Python 3.10+
- CUDA 지원 GPU (AI 추론용)
- Docker & Docker Compose (선택사항)

## 로컬 개발 환경 설정

### 1. **의존성 설치**
```bash
cd app/private
pip install -r requirements.txt
```

### 2. **데이터베이스 마이그레이션**
```bash
alembic upgrade head
```

### 3. **애플리케이션 실행**
```bash
python main.py config/develop.yaml
```

## API 문서

애플리케이션 실행 후 다음 URL에서 API 문서 확인:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 주요 엔드포인트

### AI 추론
- `POST /api/v1/upload` - 이미지 업로드 및 추론
- `GET /api/v1/health` - 헬스 체크

## 라이선스

MIT License

## 기여

이슈 및 PR 환영합니다!
