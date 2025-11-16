# SomniAI Admin Dashboard

SomniAI의 Private API를 관리하고 모니터링하기 위한 Next.js 기반 관리자 대시보드입니다.

## 기능

- **인증 시스템**: JWT 토큰 기반 로그인/로그아웃
- **API 관리**: FastAPI의 모든 엔드포인트 접근
- **모델 관리**: AI 모델 정보 조회 및 재로드
- **이미지 업로드**: Air/Side 이미지 업로드 기능
- **실시간 모니터링**: 시스템 헬스체크 및 프로세스 통계

## 기술 스택

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- Axios
- JWT Authentication

## 설치 및 실행

### 1. 의존성 설치

```bash
cd admin-dashboard
npm install
```

### 2. 환경 변수 설정

`.env.local` 파일을 생성하고 다음 내용을 추가합니다:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속

### 4. 프로덕션 빌드

```bash
npm run build
npm start
```

## 사용 방법

### 1. 로그인

- 기본 경로(`/`)로 접속하면 자동으로 로그인 페이지(`/login`)로 리다이렉트됩니다
- FastAPI에서 생성한 사용자 계정으로 로그인합니다

### 2. 대시보드

로그인 후 대시보드에서 다음 기능을 사용할 수 있습니다:

- **시스템 상태**: FastAPI 헬스체크 결과 확인
- **모델 정보**: 현재 로드된 AI 모델 정보 조회
- **모델 재로드**: Air, Side, 또는 전체 모델 재로드
- **프로세스 통계**: 큐 상태 등 프로세스 통계 확인
- **이미지 업로드**: Air/Side 타입 이미지 업로드 및 결과 확인

## API 엔드포인트

### 인증
- `POST /api/v1/auth/login` - 로그인
- `POST /api/v1/auth/register` - 회원가입
- `GET /api/v1/auth/me` - 현재 사용자 정보

### 헬스체크
- `GET/POST /api/v1/health` - 헬스체크
- `GET /api/v1/ping` - 핑

### 모델 관리
- `GET /api/v1/model/info` - 모델 정보 조회
- `GET /api/v1/model/stats` - 프로세스 통계
- `POST /api/v1/model/reload` - 모델 재로드

### 업로드
- `POST /api/v1/upload-air` - Air 이미지 업로드
- `POST /api/v1/upload-side` - Side 이미지 업로드

### 사용자 관리
- `GET /api/v1/users` - 사용자 목록
- `POST /api/v1/users` - 사용자 생성
- `PUT /api/v1/users/{user_id}` - 사용자 업데이트

## 프로젝트 구조

```
admin-dashboard/
├── app/
│   ├── dashboard/         # 대시보드 페이지
│   ├── login/            # 로그인 페이지
│   ├── layout.tsx        # 루트 레이아웃
│   └── page.tsx          # 홈 (리다이렉트)
├── contexts/
│   └── AuthContext.tsx   # 인증 컨텍스트
├── lib/
│   └── api-client.ts     # API 클라이언트
└── components/           # 재사용 가능한 컴포넌트
```

## 개발 가이드

### API 클라이언트 사용

```typescript
import { authApi, healthApi, uploadApi } from '@/lib/api-client';

// 로그인
const response = await authApi.login('username', 'password');

// 모델 정보 조회
const modelInfo = await healthApi.getModelInfo();

// 파일 업로드
const files: File[] = [...];
const result = await uploadApi.uploadAir(files);
```

### 인증 컨텍스트 사용

```typescript
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, login, logout } = useAuth();

  // 사용자 정보 접근
  console.log(user?.name);

  // 로그아웃
  const handleLogout = () => logout();
}
```

## 보안

- JWT 토큰은 쿠키에 저장되며 1일 후 만료됩니다
- 모든 API 요청에 자동으로 Bearer 토큰이 포함됩니다
- 401 응답 시 자동으로 로그아웃 처리됩니다

## 라이선스

이 프로젝트는 SomniAI 프로젝트의 일부입니다.
