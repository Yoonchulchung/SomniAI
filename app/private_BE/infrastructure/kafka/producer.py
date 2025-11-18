"""
Kafka Producer Service
"""
import json
import base64
from typing import Optional
from aiokafka import AIOKafkaProducer
from infrastructure.logging import get_logger

logger = get_logger("kafka.producer")


class KafkaProducerService:
    """Kafka Producer 서비스"""

    def __init__(self, bootstrap_servers: str):
        self.bootstrap_servers = bootstrap_servers
        self.producer: Optional[AIOKafkaProducer] = None

    async def start(self):
        """Producer 시작"""
        try:
            self.producer = AIOKafkaProducer(
                bootstrap_servers=self.bootstrap_servers,
                value_serializer=lambda v: json.dumps(v).encode('utf-8')
            )
            await self.producer.start()
            logger.info(f"Kafka Producer started: {self.bootstrap_servers}")
        except Exception as e:
            logger.error(f"Failed to start Kafka Producer: {e}")
            raise

    async def stop(self):
        """Producer 중지"""
        if self.producer:
            await self.producer.stop()
            logger.info("Kafka Producer stopped")

    async def send_image(self, topic: str, image_data: bytes, metadata: dict = None):
        """
        이미지 데이터를 Kafka로 전송

        Args:
            topic: Kafka 토픽 이름
            image_data: 이미지 바이트 데이터
            metadata: 추가 메타데이터
        """
        if not self.producer:
            raise RuntimeError("Producer not started")

        try:
            # 이미지를 base64로 인코딩
            image_base64 = base64.b64encode(image_data).decode('utf-8')

            message = {
                "image": image_base64,
                "metadata": metadata or {}
            }

            # 메시지 전송
            await self.producer.send_and_wait(topic, value=message)
            logger.info(f"Message sent to topic: {topic}")

        except Exception as e:
            logger.error(f"Failed to send message to Kafka: {e}")
            raise

    async def send_images(self, topic: str, images: list[bytes], metadata: dict = None):
        """
        여러 이미지를 Kafka로 전송

        Args:
            topic: Kafka 토픽 이름
            images: 이미지 바이트 데이터 리스트
            metadata: 추가 메타데이터
        """
        if not self.producer:
            raise RuntimeError("Producer not started")

        try:
            # 이미지들을 base64로 인코딩
            images_base64 = [base64.b64encode(img).decode('utf-8') for img in images]

            message = {
                "images": images_base64,
                "metadata": metadata or {}
            }

            # 메시지 전송
            await self.producer.send_and_wait(topic, value=message)
            logger.info(f"Multiple images sent to topic: {topic}")

        except Exception as e:
            logger.error(f"Failed to send images to Kafka: {e}")
            raise
