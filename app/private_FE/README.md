# SomniAI Admin Dashboard

SomniAI의 Private API를 관리하고 모니터링하기 위한 Next.js 기반 관리자 대시보드입니다.

## 기능

- **API 관리**: FastAPI의 모든 엔드포인트 접근 (인증 불필요)
- **모델 관리**: AI 모델 정보 조회 및 재로드
- **이미지 업로드**: Air/Side 이미지 업로드 기능
- **실시간 모니터링**: 시스템 헬스체크 및 프로세스 통계
- **API 로그**: API 요청 로그 조회 및 통계
- **결과 조회**: 분석 결과 확인

## 기술 스택

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- Axios

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

### 1. 접속

- 기본 경로(`/`)로 접속하면 자동으로 대시보드(`/dashboard`)로 리다이렉트됩니다
- 인증 없이 바로 모든 기능을 사용할 수 있습니다

### 2. 대시보드

대시보드에서 다음 기능을 사용할 수 있습니다:

- **시스템 상태**: FastAPI 헬스체크 결과 확인
- **모델 정보**: 현재 로드된 AI 모델 정보 조회
- **모델 재로드**: Air, Side, 또는 전체 모델 재로드
- **프로세스 통계**: 큐 상태 등 프로세스 통계 확인
- **이미지 업로드**: Air/Side 타입 이미지 업로드 및 결과 확인
- **API 로그**: API 요청 로그 및 통계 조회
- **분석 결과**: 측면/공중 자세 분석 결과 확인

## API 엔드포인트

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

### API 로그
- `GET /api/v1/api-logs` - 로그 목록 조회
- `GET /api/v1/api-logs/{log_id}` - 로그 상세 조회
- `GET /api/v1/api-logs/stats/summary` - 통계 조회

## 프로젝트 구조

```
admin-dashboard/
├── app/
│   ├── dashboard/         # 대시보드 페이지
│   │   ├── page.tsx      # 메인 대시보드
│   │   ├── logs/         # API 로그 페이지
│   │   └── results/      # 분석 결과 페이지
│   ├── layout.tsx        # 루트 레이아웃
│   └── page.tsx          # 홈 (대시보드로 리다이렉트)
├── lib/
│   ├── api/              # API 클라이언트
│   └── utils/            # 유틸리티 함수
├── hooks/                # 커스텀 훅
└── components/           # 재사용 가능한 컴포넌트
```

## 개발 가이드

### API 클라이언트 사용

```typescript
import { healthApi, uploadApi, logsApi, resultApi } from '@/lib/api';

// 모델 정보 조회
const modelInfo = await healthApi.getModelInfo();

// 파일 업로드
const files: File[] = [...];
const result = await uploadApi.uploadAir(files);

// API 로그 조회
const logs = await logsApi.getLogs({ page: 1, items_per_page: 20 });

// 분석 결과 조회
const sideResult = await resultApi.getSideResult();
```

### 커스텀 훅 사용

```typescript
import { useModelInfo, useUpload, useLogs, useResults } from '@/hooks';

function MyComponent() {
  const { modelInfo, loading, refresh } = useModelInfo();
  const { upload, loading: uploadLoading } = useUpload();

  // 모델 정보 사용
  console.log(modelInfo);
}
```

## 라이선스

이 프로젝트는 SomniAI 프로젝트의 일부입니다.
