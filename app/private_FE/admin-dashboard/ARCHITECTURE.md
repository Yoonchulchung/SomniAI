# Admin Dashboard 아키텍처 문서

## 개요

SomniAI Admin Dashboard는 Next.js 16, React 19, TypeScript 5를 기반으로 한 관리자 대시보드입니다.
안정적이고 유지보수하기 쉬운 구조를 위해 모듈화된 아키텍처를 적용했습니다.

## 기술 스택

- **프레임워크**: Next.js 16.0.3 (App Router)
- **UI 라이브러리**: React 19.2.0
- **언어**: TypeScript 5
- **스타일링**: Tailwind CSS 4
- **HTTP 클라이언트**: Axios 1.13.2
- **상태 관리**: React Context API
- **쿠키 관리**: js-cookie 3.0.5

## 폴더 구조

```
admin-dashboard/
├── app/                          # Next.js App Router (Pages)
│   ├── layout.tsx               # 루트 레이아웃
│   ├── page.tsx                 # 홈 페이지
│   ├── login/                   # 로그인 페이지
│   └── dashboard/               # 대시보드 페이지들
│
├── components/                   # React 컴포넌트
│   ├── common/                  # 공통 UI 컴포넌트 (Atoms & Molecules)
│   │   ├── Button.tsx           # 버튼 컴포넌트
│   │   ├── Card.tsx             # 카드 컴포넌트
│   │   ├── Input.tsx            # 입력 필드
│   │   ├── Badge.tsx            # 뱃지
│   │   ├── LoadingSpinner.tsx   # 로딩 스피너
│   │   ├── Tabs.tsx             # 탭
│   │   ├── Table.tsx            # 테이블
│   │   ├── Pagination.tsx       # 페이지네이션
│   │   ├── FileUpload.tsx       # 파일 업로드
│   │   └── index.ts             # Export 모음
│   │
│   └── features/                # 기능별 컴포넌트 (Organisms)
│       └── auth/
│           └── LoginForm.tsx    # 로그인 폼
│
├── hooks/                        # Custom React Hooks
│   ├── useModelInfo.ts          # 모델 정보 관리
│   ├── useResults.ts            # 분석 결과 관리
│   ├── useLogs.ts               # API 로그 관리
│   ├── useUpload.ts             # 파일 업로드 관리
│   └── index.ts                 # Export 모음
│
├── contexts/                     # React Context
│   └── AuthContext.tsx          # 인증 상태 관리
│
├── lib/                          # 라이브러리 및 유틸리티
│   ├── api/                     # API 클라이언트 모듈
│   │   ├── client.ts            # Axios 클라이언트
│   │   ├── auth.ts              # 인증 API
│   │   ├── health.ts            # 헬스체크 & 모델 API
│   │   ├── upload.ts            # 업로드 API
│   │   ├── result.ts            # 결과 조회 API
│   │   ├── logs.ts              # 로그 조회 API
│   │   └── index.ts             # Export 모음
│   │
│   ├── utils/                   # 유틸리티 함수
│   │   ├── format.ts            # 포맷팅 함수
│   │   ├── validation.ts        # 검증 함수
│   │   ├── constants.ts         # 상수 정의
│   │   └── index.ts             # Export 모음
│   │
│   └── api-client.ts            # 레거시 호환성 (deprecated)
│
└── types/                        # TypeScript 타입 정의
    ├── api.ts                   # API 관련 타입
    ├── auth.ts                  # 인증 관련 타입
    ├── models.ts                # 모델 관련 타입
    └── index.ts                 # Export 모음
```

## 아키텍처 패턴

### 1. Atomic Design Pattern

컴포넌트를 재사용성과 복잡도에 따라 계층화:

- **Atoms (원자)**: 기본 UI 컴포넌트 (`Button`, `Input`, `Badge` 등)
- **Molecules (분자)**: 여러 원자를 결합한 컴포넌트 (`Card`, `FileUpload` 등)
- **Organisms (유기체)**: 복잡한 기능 컴포넌트 (`LoginForm`, `LogsTable` 등)
- **Pages (페이지)**: 전체 페이지 레이아웃

### 2. Feature-based Structure

기능별로 컴포넌트를 그룹화하여 응집도를 높임:

```
components/features/
├── auth/          # 인증 관련
├── dashboard/     # 대시보드 관련
├── results/       # 결과 조회 관련
└── logs/          # 로그 조회 관련
```

### 3. Custom Hooks 패턴

비즈니스 로직을 재사용 가능한 훅으로 분리:

- `useAuth`: 인증 상태 및 로그인/로그아웃
- `useModelInfo`: 모델 정보 및 통계 조회
- `useResults`: 분석 결과 조회
- `useLogs`: API 로그 조회 및 필터링
- `useUpload`: 파일 업로드

### 4. API 모듈화

API 호출을 기능별로 분리하여 관리:

```typescript
// 사용 예시
import { authApi, healthApi, logsApi } from '@/lib/api';

await authApi.login({ name, password });
await healthApi.getModelInfo();
await logsApi.getLogs({ page: 1, limit: 20 });
```

## 주요 설계 원칙

### 1. 관심사의 분리 (Separation of Concerns)

- **UI 로직**: 컴포넌트에서 처리
- **비즈니스 로직**: Custom Hooks에서 처리
- **API 호출**: lib/api 모듈에서 처리
- **유틸리티**: lib/utils에서 제공

### 2. 단일 책임 원칙 (Single Responsibility)

각 모듈과 컴포넌트는 하나의 책임만 가짐:

- `Button` 컴포넌트는 버튼 렌더링만
- `useAuth` 훅은 인증 상태 관리만
- `authApi`는 인증 API 호출만

### 3. DRY (Don't Repeat Yourself)

공통 로직을 재사용 가능한 형태로 추출:

- 반복되는 UI → 공통 컴포넌트
- 반복되는 로직 → Custom Hooks
- 반복되는 API 호출 → API 모듈

### 4. 타입 안전성

모든 데이터 구조에 대해 TypeScript 타입 정의:

```typescript
// types/auth.ts
export interface User {
  id: string;
  name: string;
  email?: string;
}

export interface LoginCredentials {
  name: string;
  password: string;
}
```

## 데이터 흐름

```
1. 사용자 액션 (클릭, 입력 등)
    ↓
2. 컴포넌트 이벤트 핸들러
    ↓
3. Custom Hook 호출
    ↓
4. API 모듈 호출
    ↓
5. Axios Client → 서버 요청
    ↓
6. 응답 데이터 → Hook 상태 업데이트
    ↓
7. 컴포넌트 리렌더링
```

## 상태 관리

### 전역 상태 (Context API)

- **AuthContext**: 사용자 인증 상태 관리
  - `user`: 현재 로그인한 사용자 정보
  - `login()`: 로그인 함수
  - `logout()`: 로그아웃 함수

### 로컬 상태 (Custom Hooks)

각 기능별 상태는 Custom Hooks에서 관리:

```typescript
const { modelInfo, loading, error, refetch } = useModelInfo();
const { logs, filters, setFilters, setPage } = useLogs();
```

## API 인터셉터

### Request Interceptor

모든 API 요청에 JWT 토큰 자동 추가:

```typescript
config.headers.Authorization = `Bearer ${token}`;
```

### Response Interceptor

401 에러 발생 시 자동으로 로그인 페이지로 리다이렉트:

```typescript
if (error.response?.status === 401) {
  Cookies.remove('access_token');
  window.location.href = '/login';
}
```

## 스타일링 전략

### Tailwind CSS 유틸리티 클래스

일관된 디자인 시스템:

```typescript
<Button variant="primary" size="md" fullWidth />
// → bg-blue-600 text-white px-4 py-2 rounded ...
```

### 컴포넌트 Props로 스타일 제어

재사용성을 위해 variant, size 등의 props 제공:

```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}
```

## 에러 처리

### 1. Try-Catch 패턴

```typescript
try {
  const data = await api.getData();
  setData(data);
} catch (err) {
  setError(err.message);
}
```

### 2. Optional Chaining & Nullish Coalescing

```typescript
const userName = user?.name ?? '익명';
```

### 3. Promise.all with .catch()

병렬 API 호출 시 개별 에러 처리:

```typescript
const [data1, data2] = await Promise.all([
  api1().catch(() => null),
  api2().catch(() => null),
]);
```

## 성능 최적화

### 1. 병렬 API 호출

```typescript
const [modelInfo, modelStats, health] = await Promise.all([
  healthApi.getModelInfo(),
  healthApi.getModelStats(),
  healthApi.health(),
]);
```

### 2. useCallback & useMemo

불필요한 리렌더링 방지:

```typescript
const handleSetFilters = useCallback((newFilters) => {
  setFilters(newFilters);
  setCurrentPage(1);
}, []);
```

## 보안

### 1. JWT 토큰 관리

- HttpOnly 쿠키에 저장
- 1일 만료
- 401 에러 시 자동 삭제

### 2. Protected Routes

인증되지 않은 사용자는 대시보드 접근 불가:

```typescript
useEffect(() => {
  if (!authLoading && !user) {
    router.push('/login');
  }
}, [user, authLoading]);
```

## 개발 가이드

### 새로운 컴포넌트 추가

1. 공통 컴포넌트: `components/common/`
2. 기능 컴포넌트: `components/features/[feature-name]/`
3. index.ts에 export 추가

### 새로운 API 추가

1. `lib/api/` 에 새 파일 생성
2. API 함수 작성
3. `lib/api/index.ts`에 export 추가

### 새로운 Hook 추가

1. `hooks/` 에 새 파일 생성
2. Custom Hook 작성
3. `hooks/index.ts`에 export 추가

### 새로운 타입 추가

1. `types/` 에 타입 정의
2. `types/index.ts`에 export 추가

## 마이그레이션 가이드

### 레거시 코드에서 새 구조로

**Before:**
```typescript
import { authApi } from '@/lib/api-client';
```

**After:**
```typescript
import { authApi } from '@/lib/api';
```

**변경사항:**
- `@/lib/api-client` → `@/lib/api`
- `@/contexts/AuthContext` → `@/hooks` (useAuth)

## 향후 개선 사항

1. **테스트 추가**: Jest, React Testing Library
2. **상태 관리 라이브러리**: Zustand 또는 Redux (필요시)
3. **컴포넌트 라이브러리**: shadcn/ui 도입 검토
4. **에러 바운더리**: 전역 에러 처리
5. **로깅**: Sentry 등 에러 트래킹
6. **성능 모니터링**: Web Vitals 측정

## 참고 자료

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [TypeScript](https://www.typescriptlang.org)
