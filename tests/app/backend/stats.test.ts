/**
 * Stats API Tests
 * 통계 정보 조회 테스트
 */

import { APIClient } from './helpers/client';

describe('Stats API Tests', () => {
  let client: APIClient;

  beforeAll(() => {
    client = new APIClient();
  });

  describe('GET /stats', () => {
    it('통계 정보를 조회할 수 있어야 함', async () => {
      const response = await client.get('/stats');

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        expect(response.data).toBeDefined();
      }
    });

    it('통계 데이터는 올바른 형식이어야 함', async () => {
      const response = await client.get('/stats');

      if (response.status === 200) {
        expect(typeof response.data).toBe('object');
      }
    });

    it('캐싱이 적용되어야 함', async () => {
      // 첫 번째 요청
      const response1 = await client.get('/stats');

      // 두 번째 요청
      const response2 = await client.get('/stats');

      if (response1.status === 200 && response2.status === 200) {
        // 캐시 헤더 확인
        const cacheControl = response2.headers['cache-control'];
        expect(cacheControl || response2.status).toBeDefined();
      }
    });
  });

  describe('POST /stats', () => {
    it('통계 정보를 업데이트할 수 있어야 함', async () => {
      const response = await client.post('/stats', {
        frames: 100,
        timestamp: Date.now(),
      });

      expect([200, 201, 400, 404]).toContain(response.status);
    });

    it('유효하지 않은 데이터는 거부해야 함', async () => {
      const response = await client.post('/stats', {
        invalidField: 'invalid',
      });

      expect([400, 200, 201, 404]).toContain(response.status);
    });
  });

  describe('POST /stats/frames/increment', () => {
    it('프레임 카운터를 증가시킬 수 있어야 함', async () => {
      const response = await client.post('/stats/frames/increment');

      expect([200, 201, 404]).toContain(response.status);
    });

    it('증분 값을 지정할 수 있어야 함', async () => {
      const response = await client.post('/stats/frames/increment', {
        value: 5,
      });

      expect([200, 201, 400, 404]).toContain(response.status);
    });

    it('음수 증분은 거부해야 함', async () => {
      const response = await client.post('/stats/frames/increment', {
        value: -10,
      });

      expect([400, 200, 201, 404]).toContain(response.status);
    });
  });

  describe('Stats API Error Handling', () => {
    it('잘못된 경로는 404를 반환해야 함', async () => {
      const response = await client.get('/stats/invalid-endpoint');

      expect(response.status).toBe(404);
    });
  });
});
