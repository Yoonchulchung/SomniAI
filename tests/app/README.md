# App Tests

이 디렉토리는 `app/` 폴더 내의 API와 기능들을 테스트하는 코드를 포함합니다.

## 구조

```
tests/app/
├── backend/          # Backend API 테스트
│   ├── health.test.ts
│   ├── auth.test.ts
│   ├── description.test.ts
│   ├── mqtt.test.ts
│   └── stats.test.ts
├── frontend/         # Frontend 테스트
│   ├── api-client.test.ts
│   └── utils.test.ts
├── integration/      # 통합 테스트
│   └── e2e.test.ts
└── helpers/          # 테스트 헬퍼
    └── setup.ts
```

## 실행 방법

### Backend API 테스트
```bash
cd tests/app/backend
npm install
npm test
```

### Frontend 테스트
```bash
cd tests/app/frontend
npm install
npm test
```

## 테스트 범위

### Backend API
- Health Check
- 인증 (로그인, 회원가입, 로그아웃)
- Description CRUD
- MQTT 메시지 발행/구독
- 통계 API

### Frontend
- API Client 함수
- Utility 함수
- 컴포넌트 렌더링 (선택적)
