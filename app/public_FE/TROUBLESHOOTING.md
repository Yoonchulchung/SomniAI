# SomniAI 문제 해결 가이드

## 404 오류: 서비스 상태 API 오류

### 증상
- 대시보드에서 "백엔드 연결 오류" 표시
- "서비스 상태 API 오류: 404" 로그 메시지

### 원인
백엔드 컨테이너가 최신 라우트 파일을 로드하지 못했을 수 있습니다.

### 해결 방법

#### 1. 개발 모드 재시작

```bash
# 현재 컨테이너 중지
./run.sh stop

# 또는 DEV_MODE를 사용 중이라면
DEV_MODE=true ./run.sh stop

# 개발 모드로 재시작
./run.sh dev
```

#### 2. 백엔드 로그 확인

재시작 후 백엔드 로그를 확인하여 에러가 있는지 체크:

```bash
# 모든 로그 보기
./run.sh dev
# 터미널을 새로 열고
DEV_MODE=true ./run.sh logs

# 또는 백엔드만 보기
docker logs -f somniai-backend
```

다음 로그를 확인하세요:
- ✓ Database: Connected
- ✓ Redis: Connected
- ✓ MQTT: Connected (또는 Unavailable - 이건 괜찮음)
- 🧠 SomniAI API Server Ready

#### 3. 라우트 확인

백엔드 서버가 시작되면, 다음 엔드포인트들이 작동해야 합니다:

```bash
# 헬스 체크
curl http://localhost/api/health

# 시스템 헬스 (자세한 정보)
curl http://localhost/api/system/health

# 서비스 상태
curl http://localhost/api/system/services
```

#### 4. 컨테이너 완전 재빌드 (최후의 수단)

위 방법으로 해결되지 않으면 컨테이너와 볼륨을 완전히 삭제하고 재시작:

```bash
# 모든 컨테이너와 볼륨 삭제
DEV_MODE=true ./run.sh stop
docker volume prune -f

# 개발 모드로 재시작
./run.sh dev
```

## API 엔드포인트 목록

### 시스템 관련
- `GET /api/health` - 간단한 헬스 체크
- `GET /api/system/health` - 자세한 시스템 헬스 메트릭 (CPU, 메모리, DB, Redis 등)
- `GET /api/system/services` - 서비스 연결 상태 (Database, Redis, MQTT)
- `GET /api/system/client-ip` - 클라이언트 IP 주소

### 기타
- `GET /api/stats` - 통계 정보
- `GET /api/mqtt/*` - MQTT 관련 엔드포인트
- `GET /api/auth/*` - 인증 관련 엔드포인트

## 일반적인 문제들

### 백엔드 연결 실패

**증상**: `fetch('/api/health')` 실패

**해결**:
1. Nginx 컨테이너가 실행 중인지 확인
2. 백엔드 컨테이너가 실행 중인지 확인
3. 포트 80이 다른 프로세스에 의해 사용되고 있지 않은지 확인

```bash
# 컨테이너 상태 확인
docker ps | grep somniai

# 포트 사용 확인
lsof -i :80
lsof -i :4000
```

### MQTT 연결 실패

**증상**: 로그에 "MQTT: Unavailable ⚠" 표시

**해결**: MQTT는 선택적 기능입니다. MQTT 없이도 앱이 작동합니다. MQTT를 사용하려면:

```bash
# Mosquitto 컨테이너 확인
docker ps | grep mosquitto

# Mosquitto 재시작
docker restart somniai-mosquitto
```

### Database 연결 실패

**증상**: "Database: Disconnected" 또는 Prisma 오류

**해결**:

```bash
# PostgreSQL 컨테이너 확인
docker ps | grep postgres

# Database 재시작
docker restart somniai-postgres

# Prisma 재생성
docker exec -it somniai-backend npx prisma generate
docker exec -it somniai-backend npx prisma db push
```

### Hot Reload가 작동하지 않음

**증상**: 코드 변경이 컨테이너에 반영되지 않음

**해결**:
1. 반드시 개발 모드 사용: `./run.sh dev`
2. 볼륨 마운트 확인:
   ```bash
   docker inspect somniai-frontend | grep -A 10 Mounts
   docker inspect somniai-backend | grep -A 10 Mounts
   ```
3. 컨테이너 재시작:
   ```bash
   DEV_MODE=true ./run.sh restart
   ```

### node_modules 관련 오류

**증상**: 패키지를 찾을 수 없음, import 오류

**해결**:

```bash
# 프론트엔드 의존성 재설치
docker exec -it somniai-frontend npm install

# 백엔드 의존성 재설치
docker exec -it somniai-backend npm install

# 또는 컨테이너 재시작 (자동으로 npm install 실행)
DEV_MODE=true ./run.sh restart
```

## 디버깅 팁

### 1. 컨테이너 내부 접속

```bash
# 프론트엔드 컨테이너
docker exec -it somniai-frontend sh

# 백엔드 컨테이너
docker exec -it somniai-backend sh

# 내부에서 파일 확인
ls -la
cat src/routes/index.ts
```

### 2. 실시간 로그 모니터링

```bash
# 모든 컨테이너
DEV_MODE=true ./run.sh logs

# 특정 컨테이너만
docker logs -f somniai-backend
docker logs -f somniai-frontend
docker logs -f somniai-nginx
```

### 3. 네트워크 연결 테스트

```bash
# 백엔드 컨테이너 내부에서
docker exec -it somniai-backend sh
wget -O- http://localhost:4000/api/system/services
curl http://localhost:4000/api/system/services

# Nginx를 통한 접근
curl http://nginx/api/system/services
```

## 추가 도움말

문제가 계속되면:
1. GitHub Issues에 보고
2. 백엔드 로그 전체를 첨부
3. `docker ps` 출력 첨부
4. 브라우저 콘솔 에러 첨부
