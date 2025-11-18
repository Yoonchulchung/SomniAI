"""
Kafka Upload API for MoJI App
MoJI 앱에서 Kafka를 통해 이미지를 전송하는 API
"""
from typing import List, Optional
from fastapi import APIRouter, File, HTTPException, UploadFile, Form
from core.config import get_settings
from infrastructure.kafka import KafkaProducerService
from infrastructure.logging import get_logger

router = APIRouter()
settings = get_settings()
logger = get_logger("kafka.upload")

# Kafka Producer 인스턴스 (싱글톤 패턴)
_producer: Optional[KafkaProducerService] = None


async def get_kafka_producer() -> KafkaProducerService:
    """Kafka Producer 인스턴스 가져오기"""
    global _producer
    if _producer is None:
        _producer = KafkaProducerService(settings.KAFKA_BOOTSTRAP_SERVERS)
        await _producer.start()
    return _producer


@router.post("/kafka/upload-air")
async def kafka_upload_air(
    files: List[UploadFile] = File(...),
    metadata: Optional[str] = Form(None)
):
    """
    MoJI 앱에서 Air 이미지를 Kafka로 전송

    Args:
        files: 업로드할 이미지 파일들
        metadata: JSON 형식의 메타데이터 (선택사항)
    """
    try:
        producer = await get_kafka_producer()

        # 파일 읽기
        images = []
        for file in files:
            content = await file.read()
            images.append(content)

        # 메타데이터 파싱
        import json
        meta_dict = json.loads(metadata) if metadata else {}

        # Kafka로 전송
        if len(images) == 1:
            await producer.send_image(settings.KAFKA_TOPIC_AIR, images[0], meta_dict)
        else:
            await producer.send_images(settings.KAFKA_TOPIC_AIR, images, meta_dict)

        logger.info(f"Sent {len(images)} air image(s) to Kafka")

        return {
            "status": "success",
            "message": f"Successfully sent {len(images)} image(s) to Kafka topic: {settings.KAFKA_TOPIC_AIR}",
            "image_count": len(images)
        }

    except Exception as e:
        logger.error(f"Failed to upload air images to Kafka: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload images to Kafka: {str(e)}"
        )


@router.post("/kafka/upload-side")
async def kafka_upload_side(
    files: List[UploadFile] = File(...),
    metadata: Optional[str] = Form(None)
):
    """
    MoJI 앱에서 Side 이미지를 Kafka로 전송

    Args:
        files: 업로드할 이미지 파일들
        metadata: JSON 형식의 메타데이터 (선택사항)
    """
    try:
        producer = await get_kafka_producer()

        # 파일 읽기
        images = []
        for file in files:
            content = await file.read()
            images.append(content)

        # 메타데이터 파싱
        import json
        meta_dict = json.loads(metadata) if metadata else {}

        # Kafka로 전송
        if len(images) == 1:
            await producer.send_image(settings.KAFKA_TOPIC_SIDE, images[0], meta_dict)
        else:
            await producer.send_images(settings.KAFKA_TOPIC_SIDE, images, meta_dict)

        logger.info(f"Sent {len(images)} side image(s) to Kafka")

        return {
            "status": "success",
            "message": f"Successfully sent {len(images)} image(s) to Kafka topic: {settings.KAFKA_TOPIC_SIDE}",
            "image_count": len(images)
        }

    except Exception as e:
        logger.error(f"Failed to upload side images to Kafka: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload images to Kafka: {str(e)}"
        )


@router.get("/kafka/health")
async def kafka_health():
    """Kafka 연결 상태 확인"""
    try:
        producer = await get_kafka_producer()
        return {
            "status": "healthy",
            "kafka_servers": settings.KAFKA_BOOTSTRAP_SERVERS,
            "topics": {
                "air": settings.KAFKA_TOPIC_AIR,
                "side": settings.KAFKA_TOPIC_SIDE
            }
        }
    except Exception as e:
        logger.error(f"Kafka health check failed: {e}")
        raise HTTPException(
            status_code=503,
            detail=f"Kafka service unavailable: {str(e)}"
        )
