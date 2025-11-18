"""
Kafka Consumer Service
"""
import json
import base64
import asyncio
from typing import Callable, Optional
from aiokafka import AIOKafkaConsumer
from infrastructure.logging import get_logger

logger = get_logger("kafka.consumer")


class KafkaConsumerService:
    """Kafka Consumer 서비스"""

    def __init__(self, bootstrap_servers: str, group_id: str, topics: list[str]):
        self.bootstrap_servers = bootstrap_servers
        self.group_id = group_id
        self.topics = topics
        self.consumer: Optional[AIOKafkaConsumer] = None
        self._running = False
        self._task: Optional[asyncio.Task] = None

    async def start(self):
        """Consumer 시작"""
        try:
            self.consumer = AIOKafkaConsumer(
                *self.topics,
                bootstrap_servers=self.bootstrap_servers,
                group_id=self.group_id,
                value_deserializer=lambda m: json.loads(m.decode('utf-8')),
                auto_offset_reset='earliest'
            )
            await self.consumer.start()
            logger.info(f"Kafka Consumer started: {self.bootstrap_servers}, topics: {self.topics}")
        except Exception as e:
            logger.error(f"Failed to start Kafka Consumer: {e}")
            raise

    async def stop(self):
        """Consumer 중지"""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

        if self.consumer:
            await self.consumer.stop()
            logger.info("Kafka Consumer stopped")

    async def consume(self, message_handler: Callable):
        """
        메시지 소비 시작

        Args:
            message_handler: 메시지를 처리할 콜백 함수
        """
        if not self.consumer:
            raise RuntimeError("Consumer not started")

        self._running = True
        self._task = asyncio.create_task(self._consume_loop(message_handler))

    async def _consume_loop(self, message_handler: Callable):
        """메시지 소비 루프"""
        try:
            async for message in self.consumer:
                if not self._running:
                    break

                try:
                    logger.info(f"Received message from topic: {message.topic}")

                    # 메시지 처리
                    await message_handler(message.topic, message.value)

                except Exception as e:
                    logger.error(f"Error processing message: {e}")
                    # 메시지 처리 실패해도 계속 진행

        except asyncio.CancelledError:
            logger.info("Consumer loop cancelled")
        except Exception as e:
            logger.error(f"Consumer loop error: {e}")

    @staticmethod
    def decode_image(image_base64: str) -> bytes:
        """Base64 인코딩된 이미지를 디코딩"""
        return base64.b64decode(image_base64)

    @staticmethod
    def decode_images(images_base64: list[str]) -> list[bytes]:
        """Base64 인코딩된 이미지 리스트를 디코딩"""
        return [base64.b64decode(img) for img in images_base64]
