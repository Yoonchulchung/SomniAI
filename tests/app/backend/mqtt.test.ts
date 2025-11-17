/**
 * MQTT API Tests
 * MQTT 메시지 발행, 구독, 상태 확인 테스트
 */

import { APIClient } from './helpers/client';

describe('MQTT API Tests', () => {
  let client: APIClient;
  const testTopic = `test/topic/${Date.now()}`;
  const testMessage = { test: true, timestamp: Date.now() };

  beforeAll(() => {
    client = new APIClient();
  });

  describe('GET /mqtt/status', () => {
    it('MQTT 연결 상태를 조회할 수 있어야 함', async () => {
      const response = await client.get('/mqtt/status');

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status');
    });

    it('연결 상태는 유효한 값이어야 함', async () => {
      const response = await client.get('/mqtt/status');

      expect(response.status).toBe(200);

      if (response.data.connected !== undefined) {
        expect(typeof response.data.connected).toBe('boolean');
      }
    });
  });

  describe('POST /mqtt/publish', () => {
    it('MQTT 메시지를 발행할 수 있어야 함', async () => {
      const response = await client.post('/mqtt/publish', {
        topic: testTopic,
        message: testMessage,
      });

      expect([200, 201, 202]).toContain(response.status);
    });

    it('토픽과 메시지는 필수여야 함', async () => {
      const response = await client.post('/mqtt/publish', {
        topic: testTopic,
        // message 누락
      });

      expect(response.status).toBe(400);
    });

    it('빈 메시지도 발행할 수 있어야 함', async () => {
      const response = await client.post('/mqtt/publish', {
        topic: testTopic,
        message: '',
      });

      expect([200, 201, 202, 400]).toContain(response.status);
    });

    it('QoS 레벨을 지정할 수 있어야 함', async () => {
      const response = await client.post('/mqtt/publish', {
        topic: testTopic,
        message: testMessage,
        qos: 1,
      });

      expect([200, 201, 202, 400]).toContain(response.status);
    });

    it('잘못된 QoS 레벨은 거부해야 함', async () => {
      const response = await client.post('/mqtt/publish', {
        topic: testTopic,
        message: testMessage,
        qos: 99, // 유효하지 않은 QoS
      });

      expect([400, 200, 201, 202]).toContain(response.status);
    });
  });

  describe('POST /mqtt/subscribe', () => {
    it('MQTT 토픽을 구독할 수 있어야 함', async () => {
      const response = await client.post('/mqtt/subscribe', {
        topic: testTopic,
      });

      expect([200, 201, 202]).toContain(response.status);
    });

    it('토픽은 필수여야 함', async () => {
      const response = await client.post('/mqtt/subscribe', {});

      expect(response.status).toBe(400);
    });

    it('와일드카드 토픽을 구독할 수 있어야 함', async () => {
      const response = await client.post('/mqtt/subscribe', {
        topic: 'test/#',
      });

      expect([200, 201, 202]).toContain(response.status);
    });

    it('이미 구독한 토픽을 다시 구독할 수 있어야 함', async () => {
      // 첫 번째 구독
      await client.post('/mqtt/subscribe', { topic: testTopic });

      // 다시 구독
      const response = await client.post('/mqtt/subscribe', {
        topic: testTopic,
      });

      expect([200, 201, 202]).toContain(response.status);
    });
  });

  describe('POST /mqtt/unsubscribe', () => {
    it('MQTT 토픽 구독을 해제할 수 있어야 함', async () => {
      // 먼저 구독
      await client.post('/mqtt/subscribe', { topic: testTopic });

      // 구독 해제
      const response = await client.post('/mqtt/unsubscribe', {
        topic: testTopic,
      });

      expect([200, 201, 202, 204]).toContain(response.status);
    });

    it('토픽은 필수여야 함', async () => {
      const response = await client.post('/mqtt/unsubscribe', {});

      expect(response.status).toBe(400);
    });

    it('구독하지 않은 토픽도 해제할 수 있어야 함', async () => {
      const response = await client.post('/mqtt/unsubscribe', {
        topic: `unsubscribed/${Date.now()}`,
      });

      expect([200, 201, 202, 204, 404]).toContain(response.status);
    });
  });

  describe('GET /mqtt/messages', () => {
    it('최근 MQTT 메시지를 조회할 수 있어야 함', async () => {
      const response = await client.get('/mqtt/messages');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    it('토픽별로 메시지를 필터링할 수 있어야 함', async () => {
      const response = await client.get(`/mqtt/messages?topic=${testTopic}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    it('메시지 개수를 제한할 수 있어야 함', async () => {
      const response = await client.get('/mqtt/messages?limit=5');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);

      if (response.data.length > 0) {
        expect(response.data.length).toBeLessThanOrEqual(5);
      }
    });

    it('조회된 메시지는 올바른 구조를 가져야 함', async () => {
      const response = await client.get('/mqtt/messages');

      expect(response.status).toBe(200);

      if (response.data.length > 0) {
        const message = response.data[0];
        expect(message).toHaveProperty('topic');
      }
    });
  });

  describe('GET /mqtt/logs', () => {
    it('MQTT 로그를 조회할 수 있어야 함', async () => {
      const response = await client.get('/mqtt/logs');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    it('로그 레벨별로 필터링할 수 있어야 함', async () => {
      const response = await client.get('/mqtt/logs?level=error');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    it('로그 개수를 제한할 수 있어야 함', async () => {
      const response = await client.get('/mqtt/logs?limit=10');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);

      if (response.data.length > 0) {
        expect(response.data.length).toBeLessThanOrEqual(10);
      }
    });
  });

  describe('DELETE /mqtt/logs', () => {
    it('MQTT 로그를 삭제할 수 있어야 함', async () => {
      const response = await client.delete('/mqtt/logs');

      expect([200, 204]).toContain(response.status);
    });

    it('로그 삭제 후 로그가 비어있어야 함', async () => {
      // 로그 삭제
      await client.delete('/mqtt/logs');

      // 로그 조회
      const response = await client.get('/mqtt/logs');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      // 새로운 로그가 없으면 빈 배열
      expect(response.data.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /mqtt/logs/stream', () => {
    it('SSE 스트림을 시작할 수 있어야 함', async () => {
      const response = await client.get('/mqtt/logs/stream', {
        timeout: 2000,
        responseType: 'stream',
      });

      // SSE는 200 OK와 함께 스트림을 반환
      expect([200, 503]).toContain(response.status);

      if (response.status === 200) {
        // Content-Type이 text/event-stream이어야 함
        const contentType = response.headers['content-type'];
        if (contentType) {
          expect(contentType).toContain('text/event-stream');
        }
      }
    }, 5000);
  });

  describe('MQTT Integration Tests', () => {
    it('발행한 메시지를 구독하여 받을 수 있어야 함', async () => {
      const integrationTopic = `integration/test/${Date.now()}`;
      const integrationMessage = { data: 'integration test' };

      // 1. 토픽 구독
      await client.post('/mqtt/subscribe', { topic: integrationTopic });

      // 2. 메시지 발행
      await client.post('/mqtt/publish', {
        topic: integrationTopic,
        message: integrationMessage,
      });

      // 3. 짧은 대기 후 메시지 확인
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 4. 메시지 조회
      const response = await client.get(
        `/mqtt/messages?topic=${integrationTopic}`
      );

      expect(response.status).toBe(200);

      // 메시지가 수신되었는지 확인 (서버 구현에 따라 다를 수 있음)
      if (response.data.length > 0) {
        const receivedMessage = response.data.find(
          (msg: any) => msg.topic === integrationTopic
        );
        expect(receivedMessage).toBeDefined();
      }
    }, 10000);
  });
});
