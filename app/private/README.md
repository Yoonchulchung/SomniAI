# SomniAI - Clean Architecture Implementation

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

## 주요 특징

- **Clean Architecture**: 계층 분리 및 의존성 규칙 준수
- **Dependency Injection**: dependency-injector를 사용한 DI
- **환경 변수 기반 설정**: Pydantic Settings 사용
- **타입 안정성**: Python 타입 힌팅 적용
- **확장 가능한 구조**: 모듈 단위로 독립적인 개발 가능

## 시작하기

### 필수 요구사항

- Python 3.10+
- CUDA 지원 GPU (AI 추론용)
- Docker & Docker Compose (선택사항)

### 로컬 개발 환경 설정

1. **의존성 설치**
```bash
cd app/private
pip install -r requirements.txt
pip install pydantic-settings pymysql
```

2. **환경 변수 설정**
```bash
cp .env.example .env
# .env 파일을 열어서 필요한 값 수정
```

3. **데이터베이스 마이그레이션**
```bash
alembic upgrade head
```

4. **애플리케이션 실행**
```bash
python main.py config/develop.yaml
```

### Docker로 실행

1. **환경 변수 설정**
```bash
cp .env.example .env
# .env 파일 수정
```

2. **Docker Compose로 실행**
```bash
docker-compose up -d
```

3. **로그 확인**
```bash
docker-compose logs -f api
```

## API 문서

애플리케이션 실행 후 다음 URL에서 API 문서 확인:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 주요 엔드포인트

### 인증
- `POST /api/v1/auth/login` - 로그인
- `POST /api/v1/auth/register` - 회원가입
- `GET /api/v1/auth/me` - 현재 사용자 정보

### API 로그
- `GET /api/v1/api-logs` - API 로그 목록
- `GET /api/v1/api-logs/{log_id}` - API 로그 상세
- `GET /api/v1/api-logs/stats/summary` - API 통계

### AI 추론
- `POST /api/v1/upload` - 이미지 업로드 및 추론
- `GET /api/v1/health` - 헬스 체크

## 개발 가이드

### 새 모듈 추가하기

1. `modules/` 아래에 새 디렉토리 생성
2. Clean Architecture 계층 구조 생성:
   - `domain/` - 도메인 엔티티, 리포지토리 인터페이스
   - `application/` - 유즈케이스, DTO
   - `infrastructure/` - 리포지토리 구현, 외부 서비스
   - `interface/` - API 라우터

3. `containers.py`에 DI 설정 추가

### 데이터베이스 마이그레이션

```bash
# 마이그레이션 파일 생성
alembic revision --autogenerate -m "description"

# 마이그레이션 적용
alembic upgrade head

# 롤백
alembic downgrade -1
```

## 테스트

```bash
pytest
```

## 배포

### Production 설정

1. `.env` 파일에서 다음 값 업데이트:
   - `DEBUG=false`
   - `RELOAD=false`
   - `JWT_SECRET_KEY` - 강력한 랜덤 문자열로 변경
   - `MYSQL_ROOT_PASSWORD` - 안전한 비밀번호로 변경
   - `CORS_ORIGINS` - 허용할 도메인만 지정

2. Docker Compose로 배포:
```bash
docker-compose up -d
```

## 라이선스

MIT License

## 기여

이슈 및 PR 환영합니다!
