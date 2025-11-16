# Model Management Guide

SomniAI 서버의 모델을 동적으로 관리하고 변경하는 방법을 설명합니다.

## 기능

### 1. Hot Reload
파일을 저장하면 서버가 자동으로 재시작됩니다.

**설정 확인:**
```yaml
# config.yaml
FASTAPI:
  RELOAD: true  # Hot reload 활성화
  WORKERS: 1    # Reload 사용 시 자동으로 1로 설정
```

### 2. 동적 모델 변경

서버를 재시작하지 않고 런타임에 모델을 변경할 수 있습니다.

## 사용 방법

### CLI를 통한 모델 관리

#### 1. 대화형 모드 (권장)
```bash
cd app/private
python model_cli.py interactive
```

대화형 모드에서 사용 가능한 명령어:
- `info` - 현재 로드된 모델 정보 조회
- `stats` - 프로세스 상태 (큐 크기 등) 조회
- `reload side` - Side 모델만 재로드
- `reload air` - Air 모델만 재로드
- `reload all` - 모든 모델 재로드
- `help` - 도움말
- `quit` - 종료

#### 2. 단일 명령어 실행
```bash
# 모델 정보 조회
python model_cli.py info

# 프로세스 통계 조회
python model_cli.py stats

# Side 모델 재로드
python model_cli.py reload side

# Air 모델 재로드
python model_cli.py reload air

# 모든 모델 재로드
python model_cli.py reload all
```

#### 3. 다른 서버 주소 지정
```bash
python model_cli.py --server http://192.168.1.100:8000 info
```

### API를 통한 모델 관리

서버가 실행 중일 때 HTTP API를 통해 모델을 관리할 수 있습니다.

#### 1. 모델 정보 조회
```bash
curl http://localhost:8000/api/v1/model/info
```

응답 예시:
```json
{
  "pose_model": "MMPose-HRNet",
  "vlm_model": "Qwen2-VL",
  "available_models": ["MMPose", "YOLO"],
  "device": "cuda"
}
```

#### 2. 프로세스 상태 조회
```bash
curl http://localhost:8000/api/v1/model/stats
```

응답 예시:
```json
{
  "side": {
    "queue_size": 0,
    "result_queue_size": 1
  },
  "air": {
    "queue_size": 0,
    "result_queue_size": 0
  }
}
```

#### 3. 모델 재로드
```bash
# Side 모델만 재로드
curl -X POST http://localhost:8000/api/v1/model/reload/side

# Air 모델만 재로드
curl -X POST http://localhost:8000/api/v1/model/reload/air

# 모든 모델 재로드
curl -X POST http://localhost:8000/api/v1/model/reload/all
```

응답 예시:
```json
{
  "status": "success",
  "message": "Side model reloaded successfully",
  "model": "MMPose-HRNet"
}
```

### Swagger UI를 통한 모델 관리

1. 브라우저에서 `http://localhost:8000/docs` 접속
2. **model** 태그의 엔드포인트들 확인
3. `Try it out` 버튼을 클릭하여 API 테스트

## 아키텍처

### ModelManager
모든 모델과 프로세스를 중앙에서 관리하는 싱글톤 클래스입니다.

**주요 기능:**
- 모델 정보 조회
- 프로세스 상태 조회
- 동적 모델 재로드
- 스레드 안전한 모델 변경 (asyncio.Lock 사용)

**위치:** `app/private/inference/application/model_manager.py`

### 재로드 프로세스

1. ModelManager가 lock을 획득
2. 기존 inference 객체 삭제 (메모리 해제)
3. 새로운 inference 객체 생성
4. Process의 inference 참조 업데이트
5. Lock 해제

**주의사항:**
- 재로드 중에는 새로운 추론 요청이 대기됩니다
- 큐에 있는 기존 요청은 새로운 모델로 처리됩니다

## 사용 시나리오

### 시나리오 1: 코드 수정 후 자동 재로드
```bash
# 1. 서버 시작 (Hot reload 활성화)
python main.py config.yaml

# 2. 코드 수정 (예: pose_analyzer.py 수정)
# 3. 파일 저장
# 4. 서버가 자동으로 재시작됨 ✨
```

### 시나리오 2: 설정 변경 후 모델만 재로드
```bash
# 1. config.yaml에서 모델 설정 변경
# 2. CLI로 모델만 재로드 (서버 재시작 없이)
python model_cli.py reload all
```

### 시나리오 3: 운영 중 모델 변경
```bash
# 1. 새로운 모델 체크포인트 추가
# 2. config.yaml 업데이트
# 3. API 호출로 모델 재로드
curl -X POST http://localhost:8000/api/v1/model/reload/side
```

### 시나리오 4: 모니터링
```bash
# 대화형 모드로 실시간 모니터링
python model_cli.py interactive

# 반복적으로 상태 확인
model-cli> stats
model-cli> info
```

## 트러블슈팅

### Hot Reload가 작동하지 않을 때
1. `config.yaml`에서 `RELOAD: true` 확인
2. Hypercorn 버전 확인 (`pip install --upgrade hypercorn`)
3. Worker 수가 1인지 확인 (다중 워커에서는 reload 비활성화)

### 모델 재로드 실패
```bash
# 상세 에러 메시지 확인
curl http://localhost:8000/api/v1/model/reload/side

# 로그 확인
# 서버 콘솔에서 에러 메시지 확인
```

### CLI 연결 실패
```bash
# 서버 주소 확인
python model_cli.py --server http://localhost:8000 info

# 서버가 실행 중인지 확인
curl http://localhost:8000/api/v1/ping
```

## 참고

- **ModelManager**: `app/private/inference/application/model_manager.py`
- **Model Control API**: `app/private/inference/interface/api/v1/model_control.py`
- **CLI Tool**: `app/private/model_cli.py`
- **Boot Loader**: `app/private/boot_loader.py`

## 예제

### Python에서 API 호출
```python
import httpx
import asyncio

async def reload_models():
    async with httpx.AsyncClient() as client:
        # 모델 정보 조회
        info = await client.get("http://localhost:8000/api/v1/model/info")
        print(info.json())

        # 모델 재로드
        result = await client.post("http://localhost:8000/api/v1/model/reload/side")
        print(result.json())

asyncio.run(reload_models())
```

### Shell Script에서 사용
```bash
#!/bin/bash

# 모델 재로드 함수
reload_model() {
    echo "Reloading $1 model..."
    response=$(curl -s -X POST "http://localhost:8000/api/v1/model/reload/$1")
    echo $response | jq .
}

# 사용
reload_model "side"
reload_model "air"
```
