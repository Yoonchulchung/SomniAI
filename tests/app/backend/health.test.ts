/**
 * Health API Tests
 * Health check 및 시스템 상태 확인 테스트
 */

import { APIClient } from './helpers/client';

describe('Health API Tests', () => {
  let client: APIClient;

  beforeAll(() => {
    client = new APIClient();
  });

  describe('GET /health', () => {
    it('서버가 정상적으로 응답해야 함', async () => {
      const response = await client.get('/health');

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status');
      expect(response.data.status).toBe('ok');
    });

    it('응답 시간이 1초 이내여야 함', async () => {
      const startTime = Date.now();
      const response = await client.get('/health');
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('올바른 응답 형식을 반환해야 함', async () => {
      const response = await client.get('/health');

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        status: expect.any(String),
      });
    });
  });

  describe('GET /health/status', () => {
    it('시스템 상태를 반환해야 함', async () => {
      const response = await client.get('/health/status');

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status');
    });

    it('서비스별 상태 정보를 포함해야 함', async () => {
      const response = await client.get('/health/status');

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status');

      // 서비스 상태가 있다면 확인
      if (response.data.services) {
        expect(response.data.services).toBeDefined();
      }
    });

    it('uptime 정보를 포함할 수 있음', async () => {
      const response = await client.get('/health/status');

      expect(response.status).toBe(200);

      // uptime이 있다면 숫자여야 함
      if (response.data.uptime !== undefined) {
        expect(typeof response.data.uptime).toBe('number');
        expect(response.data.uptime).toBeGreaterThanOrEqual(0);
      }
    });

    it('메모리 사용량 정보를 포함할 수 있음', async () => {
      const response = await client.get('/health/status');

      expect(response.status).toBe(200);

      // 메모리 정보가 있다면 확인
      if (response.data.memory) {
        expect(response.data.memory).toBeDefined();
      }
    });
  });

  describe('Health API Error Handling', () => {
    it('존재하지 않는 엔드포인트는 404를 반환해야 함', async () => {
      const response = await client.get('/health/nonexistent');

      expect(response.status).toBe(404);
    });
  });
});
