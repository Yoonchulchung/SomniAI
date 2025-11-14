# SomniAI Development Guide

## 개발 환경 설정

### 로컬 파일 변경 사항 실시간 반영

개발 모드를 사용하면 로컬 코드 변경이 Docker 컨테이너에 즉시 반영됩니다.

## 사용법

### 개발 모드 (권장 - Hot Reload 지원)

```bash
# 개발 모드로 시작
DEV_MODE=true ./run.sh start

# 로그 확인
DEV_MODE=true ./run.sh logs

# 중지
DEV_MODE=true ./run.sh stop

# 재시작
DEV_MODE=true ./run.sh restart
```

**특징:**
- ✅ 로컬 코드 변경 시 **즉시 반영** (Hot Reload)
- ✅ 이미지 빌드 불필요 (빠른 시작)
- ✅ `npm run dev` 사용 (개발 서버)
- ✅ `NODE_ENV=development`
- ⚠️ 첫 시작 시 `npm install` 실행 (약간 느림)

### 프로덕션 모드

```bash
# 프로덕션 모드로 시작
./run.sh start

# 로그 확인
./run.sh logs

# 중지
./run.sh stop
```

**특징:**
- ✅ 최적화된 프로덕션 빌드
- ✅ 빠른 실행 속도
- ❌ 로컬 코드 변경 시 이미지 재빌드 필요

## 개발 모드 동작 원리

### Frontend (Next.js)

```yaml
volumes:
  - .:/app:cached              # 전체 프로젝트 마운트
  - /app/node_modules         # node_modules는 컨테이너 것 사용
  - /app/.next                # .next 폴더는 컨테이너 것 사용

command: npm install && npm run dev
```

**마운트되는 파일:**
- `app/` - Next.js 페이지 및 컴포넌트
- `components/` - 재사용 컴포넌트
- `lib/` - 유틸리티 함수
- `styles/` - CSS/Tailwind 스타일
- `public/` - 정적 파일
- `next.config.ts`, `tsconfig.json`, `tailwind.config.ts` 등

### Backend (Express/Node.js)

```yaml
volumes:
  - ./server:/app:cached      # server 디렉토리 전체 마운트
  - /app/node_modules         # node_modules는 컨테이너 것 사용

command: npm install && npx prisma generate && npm run dev
```

**마운트되는 파일:**
- `server/src/` - TypeScript 소스 코드
- `server/prisma/` - Prisma 스키마
- `server/tsconfig.json` - TypeScript 설정
- `server/.env` - 환경 변수

## 개발 워크플로우

### 1. 개발 모드 시작

```bash
DEV_MODE=true ./run.sh start
```

### 2. 코드 수정

로컬 에디터(VSCode 등)에서 코드를 수정하면 자동으로 컨테이너에 반영됩니다.

**Frontend 예시:**
```bash
# app/(main)/dashboard/page.tsx 수정
vim app/\(main\)/dashboard/page.tsx

# 브라우저 자동 새로고침 (Fast Refresh)
```

**Backend 예시:**
```bash
# server/src/controllers/systemController.ts 수정
vim server/src/controllers/systemController.ts

# 서버 자동 재시작 (nodemon/ts-node-dev)
```

### 3. 로그 확인

```bash
# 전체 로그 확인
DEV_MODE=true ./run.sh logs

# 특정 서비스만 확인
docker logs -f somniai-frontend
docker logs -f somniai-backend
```

### 4. 컨테이너 접속 (디버깅)

```bash
# Frontend 컨테이너 접속
docker exec -it somniai-frontend sh

# Backend 컨테이너 접속
docker exec -it somniai-backend sh
```

## 주의사항

### node_modules

**컨테이너 내부 것을 사용합니다.**
- 로컬 `node_modules`와 컨테이너 `node_modules`는 별개
- 익명 볼륨 사용: `- /app/node_modules`
- 성능 및 호환성 문제 방지

### 빌드 폴더

**컨테이너 내부 것을 사용합니다.**
- `.next` (Frontend)
- `dist` (Backend)
- 빌드 결과물은 컨테이너에서 생성

### 의존성 추가

새로운 npm 패키지를 추가한 경우:

```bash
# 1. 로컬에서 추가
npm install some-package

# 2. 컨테이너 재시작
DEV_MODE=true ./run.sh restart
```

또는 컨테이너 안에서 직접 설치:

```bash
# Frontend
docker exec -it somniai-frontend npm install some-package

# Backend
docker exec -it somniai-backend npm install some-package
```

## 문제 해결

### 코드 변경이 반영되지 않는 경우

**1. DEV_MODE 확인**
```bash
# DEV_MODE=true를 반드시 포함
DEV_MODE=true ./run.sh start
```

**2. 컨테이너 재시작**
```bash
DEV_MODE=true ./run.sh restart
```

**3. 볼륨 마운트 확인**
```bash
docker inspect somniai-frontend | grep -A 10 Mounts
```

### npm install 오류

**캐시 정리 후 재시작**
```bash
# 컨테이너 및 볼륨 삭제
DEV_MODE=true ./run.sh stop

# 다시 시작
DEV_MODE=true ./run.sh start
```

### 포트 충돌

**다른 서비스 확인**
```bash
# 포트 사용 확인
lsof -i :3000
lsof -i :4000

# 기존 프로세스 종료
kill -9 <PID>
```

## 성능 최적화

### Docker Desktop 설정 (macOS/Windows)

**File Sharing 성능 향상:**
1. Docker Desktop > Preferences > Resources > File Sharing
2. 필요한 디렉토리만 추가
3. VirtioFS 또는 gRPC FUSE 사용

### 캐시 옵션

볼륨 마운트 시 `:cached` 사용:
```yaml
- .:/app:cached  # 쓰기 작업 캐시
```

**옵션:**
- `cached` - 쓰기 캐시 (개발 권장)
- `delegated` - 읽기/쓰기 캐시 (가장 빠름, 일관성 낮음)
- 생략 - 기본값 (가장 느림, 일관성 높음)

## 추가 명령어

```bash
# 상태 확인
DEV_MODE=true ./run.sh status

# 특정 서비스 재시작
docker restart somniai-frontend
docker restart somniai-backend

# 이미지 빌드만 (개발 모드에서는 불필요)
./run.sh build
```

## 요약

| 작업 | 명령어 |
|------|--------|
| 개발 시작 | `DEV_MODE=true ./run.sh start` |
| 로그 보기 | `DEV_MODE=true ./run.sh logs` |
| 중지 | `DEV_MODE=true ./run.sh stop` |
| 재시작 | `DEV_MODE=true ./run.sh restart` |
| 프로덕션 | `./run.sh start` |

**개발 시에는 항상 `DEV_MODE=true`를 사용하세요!**
