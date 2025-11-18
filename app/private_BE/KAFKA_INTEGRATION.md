# Kafka Integration Guide

## 개요

SomniAI FastAPI 서버에 Kafka를 통한 이미지 전송 기능이 통합되었습니다. 이를 통해 MoJI 앱과 FastAPI 서버 간에 비동기 메시지 기반 통신이 가능합니다.

## 아키텍처

```
MoJI 앱 → Kafka Producer API → Kafka Broker → Kafka Consumer → FastAPI 처리 로직
                                                                  ├── upload-air
                                                                  └── upload-side
```

## 주요 구성 요소

### 1. Kafka Broker (Docker Compose)

- **Zookeeper**: Kafka 메타데이터 관리
- **Kafka**: 메시지 브로커
  - 내부 포트: `9092` (컨테이너 간 통신)
  - 외부 포트: `9093` (호스트에서 접근)

### 2. Kafka Topics

- `somniai-air-images`: Air 이미지 전송용 토픽
- `somniai-side-images`: Side 이미지 전송용 토픽

### 3. API 엔드포인트

#### MoJI 앱용 Producer API

**POST /api/v1/kafka/upload-air**
- MoJI 앱에서 Air 이미지를 Kafka로 전송
- 요청 형식: `multipart/form-data`
- 파라미터:
  - `files`: 이미지 파일 (List[UploadFile])
  - `metadata`: JSON 형식의 메타데이터 (선택사항)

**POST /api/v1/kafka/upload-side**
- MoJI 앱에서 Side 이미지를 Kafka로 전송
- 요청 형식: `multipart/form-data`
- 파라미터:
  - `files`: 이미지 파일 (List[UploadFile])
  - `metadata`: JSON 형식의 메타데이터 (선택사항)

**GET /api/v1/kafka/health**
- Kafka 연결 상태 확인

### 4. Consumer Service

Kafka에서 메시지를 받아 자동으로 처리합니다:
- `somniai-air-images` 토픽 → `AirProcess.enqueue_request()`
- `somniai-side-images` 토픽 → `SideProcess.enqueue_request()`

## 설정

### 환경 변수

`.env` 파일 또는 Docker Compose 환경 변수에서 설정:

```bash
# Kafka 설정
KAFKA_BOOTSTRAP_SERVERS=kafka:9092          # 컨테이너 내부에서 사용
KAFKA_TOPIC_AIR=somniai-air-images          # Air 이미지 토픽
KAFKA_TOPIC_SIDE=somniai-side-images        # Side 이미지 토픽
KAFKA_CONSUMER_GROUP=somniai-consumer-group # Consumer 그룹 ID
```

외부에서 접근 시 (로컬 테스트):
```bash
KAFKA_BOOTSTRAP_SERVERS=localhost:9093
```

## 시작 방법

### 1. Docker Compose로 전체 시스템 시작

```bash
cd app/private_BE
docker-compose up -d
```

이 명령은 다음 서비스를 시작합니다:
- Zookeeper
- Kafka
- MySQL
- FastAPI 서버 (Kafka Consumer 포함)

### 2. 서비스 상태 확인

```bash
# 모든 컨테이너 상태 확인
docker-compose ps

# Kafka 상태 확인
curl http://localhost:8000/api/v1/kafka/health
```

### 3. Kafka 토픽 확인 (선택사항)

```bash
# Kafka 컨테이너 내부로 접속
docker exec -it somniai-kafka bash

# 토픽 목록 확인
kafka-topics --bootstrap-server localhost:9092 --list

# 특정 토픽의 메시지 확인
kafka-console-consumer --bootstrap-server localhost:9092 \
  --topic somniai-air-images --from-beginning
```

## 사용 예제

### 1. MoJI 앱에서 이미지 전송 (Python)

```python
import requests

# 이미지 파일 준비
files = {
    'files': open('image.jpg', 'rb')
}

# 메타데이터 (선택사항)
data = {
    'metadata': '{"timestamp": "2025-11-18T12:00:00", "device_id": "moji-001"}'
}

# Air 이미지 전송
response = requests.post(
    'http://localhost:8000/api/v1/kafka/upload-air',
    files=files,
    data=data
)

print(response.json())
# 출력: {"status": "success", "message": "Successfully sent 1 image(s) to Kafka topic: somniai-air-images", "image_count": 1}
```

### 2. cURL을 사용한 테스트

```bash
# Air 이미지 전송
curl -X POST http://localhost:8000/api/v1/kafka/upload-air \
  -F "files=@image.jpg" \
  -F 'metadata={"timestamp": "2025-11-18T12:00:00"}'

# Side 이미지 전송
curl -X POST http://localhost:8000/api/v1/kafka/upload-side \
  -F "files=@image.jpg"
```

### 3. MoJI 앱 통합 예제 (JavaScript/React Native)

```javascript
const uploadImageToKafka = async (imageUri, type = 'air') => {
  const formData = new FormData();

  formData.append('files', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'image.jpg',
  });

  formData.append('metadata', JSON.stringify({
    timestamp: new Date().toISOString(),
    device_id: 'moji-app',
  }));

  const endpoint = type === 'air'
    ? '/api/v1/kafka/upload-air'
    : '/api/v1/kafka/upload-side';

  try {
    const response = await fetch(`http://your-server:8000${endpoint}`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const result = await response.json();
    console.log('Upload success:', result);
    return result;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
};

// 사용 예
await uploadImageToKafka('file:///path/to/image.jpg', 'air');
```

## 메시지 형식

### Producer → Kafka

```json
{
  "image": "base64_encoded_image_string",
  "metadata": {
    "timestamp": "2025-11-18T12:00:00",
    "device_id": "moji-001"
  }
}
```

또는 여러 이미지:

```json
{
  "images": [
    "base64_encoded_image_1",
    "base64_encoded_image_2"
  ],
  "metadata": {
    "timestamp": "2025-11-18T12:00:00",
    "device_id": "moji-001"
  }
}
```

## 모니터링 및 디버깅

### 로그 확인

```bash
# FastAPI 서버 로그
docker-compose logs -f api

# Kafka 로그
docker-compose logs -f kafka

# 특정 키워드로 필터링
docker-compose logs -f api | grep kafka
```

### Kafka Consumer 상태 확인

애플리케이션 시작 시 다음과 같은 로그를 확인할 수 있습니다:

```
INFO: Kafka Consumer started: kafka:9092, topics: ['somniai-air-images', 'somniai-side-images']
INFO: ImageKafkaConsumerService started successfully
INFO: Kafka Consumer initialized successfully
```

### 메시지 처리 로그

메시지가 처리될 때:

```
INFO: Received message from topic: somniai-air-images
INFO: Processing message from topic: somniai-air-images
INFO: Air image processed successfully
```

## 트러블슈팅

### 1. Kafka 연결 실패

**증상**: `Failed to start Kafka Consumer: ...`

**해결 방법**:
```bash
# Kafka 컨테이너 상태 확인
docker-compose ps kafka

# Kafka 컨테이너 재시작
docker-compose restart kafka

# 네트워크 확인
docker network inspect private_be_somniai_network
```

### 2. 메시지가 처리되지 않음

**확인 사항**:
1. Kafka 토픽이 생성되었는지 확인
2. Consumer가 정상적으로 시작되었는지 로그 확인
3. Producer가 올바른 토픽으로 전송하는지 확인

```bash
# 토픽 메시지 확인
docker exec -it somniai-kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic somniai-air-images \
  --from-beginning
```

### 3. 이미지 디코딩 오류

**증상**: `Error handling message: ...`

**원인**: Base64 인코딩/디코딩 문제

**해결**: Producer에서 이미지를 올바르게 인코딩하는지 확인

## 성능 고려사항

### 1. 이미지 크기

- 권장 최대 크기: 10MB per image
- 대용량 이미지는 압축 후 전송 권장

### 2. Kafka 설정 최적화

필요시 `docker-compose.yml`에서 Kafka 설정 조정:

```yaml
environment:
  KAFKA_MESSAGE_MAX_BYTES: 10485760  # 10MB
  KAFKA_REPLICA_FETCH_MAX_BYTES: 10485760
```

### 3. Consumer 병렬 처리

현재는 단일 Consumer로 순차 처리하지만, 필요시 파티션 추가로 병렬 처리 가능:

```bash
# 토픽 파티션 증가
docker exec -it somniai-kafka kafka-topics --bootstrap-server localhost:9092 \
  --alter --topic somniai-air-images --partitions 3
```

## 보안

### 프로덕션 환경 권장사항

1. **Kafka 인증 활성화**: SASL/SSL 설정
2. **네트워크 격리**: Kafka를 내부 네트워크에만 노출
3. **API 인증**: JWT 토큰을 통한 API 접근 제어
4. **이미지 검증**: 업로드되는 이미지 형식 및 크기 검증

## 기존 API와의 차이점

| 특징 | 기존 HTTP API | Kafka API |
|------|---------------|-----------|
| 통신 방식 | 동기 (Synchronous) | 비동기 (Asynchronous) |
| 응답 | 처리 결과 즉시 반환 | 전송 성공 여부만 반환 |
| 처리 속도 | 이미지 처리 완료까지 대기 | 즉시 응답, 백그라운드 처리 |
| 확장성 | 제한적 | 높음 (큐 기반) |
| 장애 복구 | 재시도 필요 | 자동 재처리 가능 |

## 참고 자료

- [Kafka Documentation](https://kafka.apache.org/documentation/)
- [aiokafka Documentation](https://aiokafka.readthedocs.io/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)

## 문의 및 지원

문제가 발생하거나 질문이 있는 경우:
1. GitHub Issues 등록
2. 로그 파일 첨부
3. 환경 정보 제공 (Docker 버전, OS 등)
