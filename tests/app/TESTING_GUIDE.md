# SomniAI App Testing Guide

이 가이드는 SomniAI의 app 폴더 내 API와 기능들을 테스트하는 방법을 설명합니다.

## 목차

1. [테스트 구조](#테스트-구조)
2. [사전 준비](#사전-준비)
3. [Backend API 테스트](#backend-api-테스트)
4. [Frontend 테스트](#frontend-테스트)
5. [전체 테스트 실행](#전체-테스트-실행)
6. [테스트 커버리지](#테스트-커버리지)
7. [문제 해결](#문제-해결)

## 테스트 구조

```
tests/app/
├── README.md                     # 테스트 개요
├── TESTING_GUIDE.md             # 이 파일
├── run-all-tests.sh             # 전체 테스트 실행 스크립트
├── backend/                      # Backend API 테스트
│   ├── package.json
│   ├── jest.config.js
│   ├── tsconfig.json
│   ├── helpers/
│   │   ├── config.ts            # 테스트 설정
│   │   └── client.ts            # HTTP 클라이언트
│   ├── health.test.ts           # Health API 테스트
│   ├── auth.test.ts             # 인증 API 테스트
│   ├── description.test.ts      # Description CRUD 테스트
│   ├── mqtt.test.ts             # MQTT API 테스트
│   └── stats.test.ts            # 통계 API 테스트
└── frontend/                     # Frontend 테스트
    ├── package.json
    ├── jest.config.js
    ├── tsconfig.json
    ├── utils-format.test.ts     # 포맷 유틸리티 테스트
    └── utils-validation.test.ts # 검증 유틸리티 테스트
```

## 사전 준비

### 1. API 서버 실행

테스트를 실행하기 전에 API 서버가 실행 중이어야 합니다.

```bash
# app/public_BE 디렉토리에서
cd app/public_BE
npm install
npm run dev
```

서버가 `http://localhost:4000`에서 실행됩니다.

### 2. 환경 변수 설정 (선택사항)

다른 서버 URL을 사용하려면 환경 변수를 설정하세요:

```bash
export TEST_API_URL=http://your-server:port/api
```

## Backend API 테스트

### 설치

```bash
cd tests/app/backend
npm install
```

### 개별 테스트 실행

```bash
# 모든 테스트 실행
npm test

# 특정 테스트 파일만 실행
npm test health.test.ts
npm test auth.test.ts
npm test description.test.ts
npm test mqtt.test.ts
npm test stats.test.ts

# Watch 모드로 실행
npm run test:watch

# 커버리지와 함께 실행
npm run test:coverage
```

### 테스트 케이스

#### Health API (`health.test.ts`)
- ✓ 서버 상태 확인
- ✓ 응답 시간 검증
- ✓ 시스템 상태 조회

#### Auth API (`auth.test.ts`)
- ✓ 사용자 회원가입
- ✓ 로그인/로그아웃
- ✓ 사용자 정보 조회
- ✓ 인증 토큰 검증
- ✓ 입력 검증
- ✓ Rate Limiting

#### Description API (`description.test.ts`)
- ✓ 설명 목록 조회
- ✓ 설명 상세 조회
- ✓ 설명 생성 (관리자)
- ✓ 설명 수정 (관리자)
- ✓ 설명 발행/비발행 (관리자)
- ✓ 설명 히스토리 조회 (관리자)
- ✓ 설명 삭제 (관리자)
- ✓ 권한 검증

#### MQTT API (`mqtt.test.ts`)
- ✓ 연결 상태 확인
- ✓ 메시지 발행
- ✓ 토픽 구독/구독 해제
- ✓ 메시지 조회
- ✓ 로그 조회 및 삭제
- ✓ SSE 스트림
- ✓ 통합 테스트 (발행-구독)

#### Stats API (`stats.test.ts`)
- ✓ 통계 정보 조회
- ✓ 통계 업데이트
- ✓ 프레임 카운터 증가
- ✓ 캐싱 검증

### 주의사항

1. **인증 테스트**: 일부 테스트는 실제 사용자 계정을 생성하므로, 테스트 후 DB를 정리해야 할 수 있습니다.

2. **관리자 테스트**: Description API의 관리자 기능 테스트는 관리자 계정이 필요합니다. 테스트 환경에 관리자 계정을 미리 생성하거나, `helpers/config.ts`에서 관리자 정보를 설정하세요.

3. **MQTT 테스트**: MQTT 브로커가 실행 중이어야 합니다.

4. **Rate Limiting**: Rate limiting 테스트는 실제 제한이 설정된 경우에만 의미가 있습니다.

## Frontend 테스트

### 설치

```bash
cd tests/app/frontend
npm install
```

### 테스트 실행

```bash
# 모든 테스트 실행
npm test

# 특정 테스트 파일만 실행
npm test utils-format.test.ts
npm test utils-validation.test.ts

# Watch 모드로 실행
npm run test:watch

# 커버리지와 함께 실행
npm run test:coverage
```

### 테스트 케이스

#### Format Utilities (`utils-format.test.ts`)
- ✓ formatDate: 날짜 포맷팅
- ✓ formatDateShort: 간단한 날짜 포맷팅
- ✓ formatFileSize: 파일 크기 포맷팅
- ✓ formatNumber: 숫자 포맷팅
- ✓ formatDuration: 시간 포맷팅
- ✓ formatPercent: 퍼센트 포맷팅

#### Validation Utilities (`utils-validation.test.ts`)
- ✓ isValidEmail: 이메일 검증
- ✓ isStrongPassword: 비밀번호 강도 검증
- ✓ isValidUrl: URL 검증
- ✓ hasValidExtension: 파일 확장자 검증
- ✓ isEmpty: 빈 값 검증
- ✓ isInRange: 숫자 범위 검증
- ✓ isKorean: 한글 검증
- ✓ isAlphanumeric: 영문/숫자 검증

## 전체 테스트 실행

모든 테스트를 한 번에 실행하려면:

```bash
cd tests/app
chmod +x run-all-tests.sh
./run-all-tests.sh
```

이 스크립트는:
1. Backend API 테스트 실행
2. Frontend 테스트 실행
3. 결과 요약 표시

## 테스트 커버리지

### Backend 커버리지

```bash
cd tests/app/backend
npm run test:coverage
```

커버리지 리포트는 `backend/coverage/` 디렉토리에 생성됩니다.

### Frontend 커버리지

```bash
cd tests/app/frontend
npm run test:coverage
```

커버리지 리포트는 `frontend/coverage/` 디렉토리에 생성됩니다.

### 커버리지 확인

HTML 리포트를 브라우저에서 열어보세요:

```bash
# Backend
open backend/coverage/lcov-report/index.html

# Frontend
open frontend/coverage/lcov-report/index.html
```

## 문제 해결

### API 서버에 연결할 수 없음

**문제**: `ECONNREFUSED` 에러

**해결**:
1. API 서버가 실행 중인지 확인
2. 올바른 포트(4000)에서 실행되는지 확인
3. `TEST_API_URL` 환경 변수가 올바른지 확인

### 인증 테스트 실패

**문제**: 401 Unauthorized 에러

**해결**:
1. 테스트용 사용자가 이미 존재하는지 확인
2. 이메일 중복으로 회원가입이 실패할 수 있음
3. `helpers/config.ts`에서 테스트 사용자 정보를 수정

### MQTT 테스트 실패

**문제**: MQTT 연결 실패

**해결**:
1. MQTT 브로커가 실행 중인지 확인
2. app/public_BE의 MQTT 설정 확인
3. 방화벽이 MQTT 포트를 차단하지 않는지 확인

### 타임아웃 에러

**문제**: 테스트가 타임아웃으로 실패

**해결**:
1. `jest.config.js`의 `testTimeout` 값 증가
2. 개별 테스트에 더 긴 타임아웃 설정:
   ```typescript
   it('test name', async () => {
     // test code
   }, 30000); // 30초
   ```

### 의존성 설치 실패

**문제**: npm install 에러

**해결**:
1. Node.js 버전 확인 (v18 이상 권장)
2. npm 캐시 정리: `npm cache clean --force`
3. node_modules 삭제 후 재설치:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

## CI/CD 통합

### GitHub Actions 예시

```yaml
name: App Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install API dependencies
        run: |
          cd app/public_BE
          npm install

      - name: Start API server
        run: |
          cd app/public_BE
          npm run dev &
          sleep 5

      - name: Run tests
        run: |
          cd tests/app
          chmod +x run-all-tests.sh
          ./run-all-tests.sh
```

## 베스트 프랙티스

1. **테스트 격리**: 각 테스트는 독립적이어야 하며, 다른 테스트에 영향을 주지 않아야 합니다.

2. **데이터 정리**: 테스트 후 생성된 데이터를 정리하세요.

3. **Mock 사용**: 외부 서비스는 가능한 한 mock하여 테스트 속도를 높이세요.

4. **명확한 Assertion**: 무엇을 테스트하는지 명확하게 작성하세요.

5. **에러 케이스**: 정상 케이스뿐만 아니라 에러 케이스도 테스트하세요.

## 추가 리소스

- [Jest 공식 문서](https://jestjs.io/)
- [Testing Library 문서](https://testing-library.com/)
- [Supertest 문서](https://github.com/visionmedia/supertest)

## 기여하기

새로운 테스트를 추가하거나 기존 테스트를 개선하려면:

1. 적절한 디렉토리에 테스트 파일 추가
2. 명확한 테스트 케이스 작성
3. README 업데이트
4. Pull Request 제출

## 라이선스

MIT
