"""
Kafka Consumer Service for Image Processing
Kafka로부터 메시지를 받아 기존 upload-air, upload-side 프로세스로 전달
"""
import io
from PIL import Image
from infrastructure.kafka import KafkaConsumerService
from infrastructure.logging import get_logger
from modules.inference.application.process import AirProcess, SideProcess
from modules.inference.application.registry import get_cfg
from modules.inference.application.parser import _image_bytes_to_pil
from core.config import get_settings

logger = get_logger("kafka.consumer.service")
settings = get_settings()


class ImageKafkaConsumerService:
    """이미지 처리를 위한 Kafka Consumer 서비스"""

    def __init__(self):
        self.cfg = get_cfg()
        self.consumer: KafkaConsumerService = None
        self.air_process = AirProcess.get_instance()
        self.side_process = SideProcess.get_instance()

    async def start(self):
        """Consumer 시작"""
        try:
            # Kafka Consumer 초기화
            self.consumer = KafkaConsumerService(
                bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
                group_id=settings.KAFKA_CONSUMER_GROUP,
                topics=[settings.KAFKA_TOPIC_AIR, settings.KAFKA_TOPIC_SIDE]
            )

            await self.consumer.start()

            # 메시지 소비 시작
            await self.consumer.consume(self._handle_message)

            logger.info("ImageKafkaConsumerService started successfully")

        except Exception as e:
            logger.error(f"Failed to start ImageKafkaConsumerService: {e}")
            raise

    async def stop(self):
        """Consumer 중지"""
        if self.consumer:
            await self.consumer.stop()
            logger.info("ImageKafkaConsumerService stopped")

    async def _handle_message(self, topic: str, message: dict):
        """
        Kafka 메시지 처리

        Args:
            topic: Kafka 토픽 이름
            message: 메시지 데이터 (dict)
        """
        try:
            logger.info(f"Processing message from topic: {topic}")

            # 메시지에서 이미지 추출
            if "image" in message:
                # 단일 이미지
                image_base64 = message["image"]
                image_bytes = self.consumer.decode_image(image_base64)
                images = [image_bytes]
            elif "images" in message:
                # 다중 이미지
                images_base64 = message["images"]
                images = self.consumer.decode_images(images_base64)
            else:
                logger.error("No image data found in message")
                return

            # PIL 이미지로 변환
            pil_images = []
            for img_bytes in images:
                pil_img = _image_bytes_to_pil(img_bytes)
                pil_images.append(pil_img)

            # 토픽에 따라 적절한 프로세스로 전달
            if topic == settings.KAFKA_TOPIC_AIR:
                await self._process_air_images(pil_images)
            elif topic == settings.KAFKA_TOPIC_SIDE:
                await self._process_side_images(pil_images)
            else:
                logger.warning(f"Unknown topic: {topic}")

        except Exception as e:
            logger.error(f"Error handling message: {e}", exc_info=True)

    async def _process_air_images(self, images: list[Image.Image]):
        """Air 이미지 처리"""
        try:
            # 첫 번째 이미지만 처리 (기존 로직과 동일)
            dataset = images[0] if images else None
            if dataset:
                await self.air_process.enqueue_request(dataset)
                logger.info("Air image processed successfully")
        except Exception as e:
            logger.error(f"Failed to process air image: {e}")
            raise

    async def _process_side_images(self, images: list[Image.Image]):
        """Side 이미지 처리"""
        try:
            # 첫 번째 이미지만 처리 (기존 로직과 동일)
            dataset = images[0] if images else None
            if dataset:
                await self.side_process.enqueue_request(dataset)
                logger.info("Side image processed successfully")
        except Exception as e:
            logger.error(f"Failed to process side image: {e}")
            raise


# 전역 인스턴스
_consumer_service: ImageKafkaConsumerService = None


async def get_consumer_service() -> ImageKafkaConsumerService:
    """Consumer 서비스 인스턴스 가져오기 (싱글톤)"""
    global _consumer_service
    if _consumer_service is None:
        _consumer_service = ImageKafkaConsumerService()
    return _consumer_service


async def start_kafka_consumer():
    """Kafka Consumer 시작 (애플리케이션 시작 시 호출)"""
    service = await get_consumer_service()
    await service.start()
    logger.info("Kafka Consumer started")


async def stop_kafka_consumer():
    """Kafka Consumer 중지 (애플리케이션 종료 시 호출)"""
    global _consumer_service
    if _consumer_service:
        await _consumer_service.stop()
        logger.info("Kafka Consumer stopped")
