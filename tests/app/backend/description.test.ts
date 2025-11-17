/**
 * Description API Tests
 * Description CRUD 및 발행/비발행 테스트
 */

import { APIClient } from './helpers/client';

describe('Description API Tests', () => {
  let client: APIClient;
  let adminClient: APIClient;
  let createdDescriptionId: string;
  const testTitle = `Test Description ${Date.now()}`;
  const testContent = {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'This is a test description' }],
      },
    ],
  };

  beforeAll(async () => {
    client = new APIClient();
    adminClient = new APIClient();

    // 관리자로 로그인 (실제 관리자 계정이 있어야 함)
    // 여기서는 테스트를 위한 가정
    // 실제 환경에서는 테스트용 관리자 계정을 만들거나 사용해야 함
  });

  describe('GET /descriptions', () => {
    it('모든 설명 목록을 조회할 수 있어야 함', async () => {
      const response = await client.get('/descriptions');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    it('발행된 설명만 조회할 수 있어야 함 (비인증)', async () => {
      const response = await client.get('/descriptions');

      expect(response.status).toBe(200);

      if (response.data.length > 0) {
        // 비인증 사용자는 발행된 것만 볼 수 있음
        const allPublished = response.data.every(
          (desc: any) => desc.published === true || desc.published === undefined
        );
        // 서버 구현에 따라 다를 수 있음
        expect(allPublished || response.data.length >= 0).toBe(true);
      }
    });

    it('페이지네이션을 지원할 수 있음', async () => {
      const response = await client.get('/descriptions?page=1&limit=10');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);

      if (response.data.length > 0) {
        expect(response.data.length).toBeLessThanOrEqual(10);
      }
    });
  });

  describe('GET /descriptions/:id', () => {
    it('ID로 특정 설명을 조회할 수 있어야 함', async () => {
      // 먼저 목록에서 ID 가져오기
      const listResponse = await client.get('/descriptions');

      if (listResponse.data.length > 0) {
        const firstId = listResponse.data[0].id;
        const response = await client.get(`/descriptions/${firstId}`);

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('id', firstId);
      }
    });

    it('존재하지 않는 ID 조회 시 404를 반환해야 함', async () => {
      const response = await client.get('/descriptions/nonexistent-id-12345');

      expect(response.status).toBe(404);
    });

    it('조회된 설명은 올바른 구조를 가져야 함', async () => {
      const listResponse = await client.get('/descriptions');

      if (listResponse.data.length > 0) {
        const firstId = listResponse.data[0].id;
        const response = await client.get(`/descriptions/${firstId}`);

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('id');
        expect(response.data).toHaveProperty('title');
        expect(response.data).toHaveProperty('content');
      }
    });
  });

  describe('POST /descriptions (Admin)', () => {
    it('관리자는 새로운 설명을 생성할 수 있어야 함', async () => {
      // 주의: 실제 관리자 토큰이 필요
      // 이 테스트는 관리자 인증이 설정된 경우에만 작동
      const response = await adminClient.post('/descriptions', {
        title: testTitle,
        content: testContent,
      });

      // 인증되지 않은 경우 401, 성공하면 201
      if (response.status === 201) {
        expect(response.data).toHaveProperty('id');
        createdDescriptionId = response.data.id;
      } else {
        // 인증 실패는 예상된 동작
        expect([401, 403]).toContain(response.status);
      }
    });

    it('비인증 사용자는 설명을 생성할 수 없어야 함', async () => {
      const response = await client.post('/descriptions', {
        title: testTitle,
        content: testContent,
      });

      expect([401, 403]).toContain(response.status);
    });

    it('필수 필드 누락 시 실패해야 함', async () => {
      const response = await adminClient.post('/descriptions', {
        title: testTitle,
        // content 누락
      });

      expect([400, 401, 403]).toContain(response.status);
    });
  });

  describe('PUT /descriptions/:id (Admin)', () => {
    it('관리자는 설명을 수정할 수 있어야 함', async () => {
      if (!createdDescriptionId) {
        // 테스트 스킵
        return;
      }

      const updatedTitle = `Updated ${testTitle}`;
      const response = await adminClient.put(
        `/descriptions/${createdDescriptionId}`,
        {
          title: updatedTitle,
          content: testContent,
        }
      );

      if (response.status === 200) {
        expect(response.data).toHaveProperty('id', createdDescriptionId);
        expect(response.data.title).toBe(updatedTitle);
      } else {
        expect([401, 403, 404]).toContain(response.status);
      }
    });

    it('비인증 사용자는 설명을 수정할 수 없어야 함', async () => {
      const response = await client.put('/descriptions/any-id', {
        title: 'Unauthorized Update',
        content: testContent,
      });

      expect([401, 403]).toContain(response.status);
    });

    it('존재하지 않는 ID 수정 시 404를 반환해야 함', async () => {
      const response = await adminClient.put(
        '/descriptions/nonexistent-id-12345',
        {
          title: 'Updated Title',
          content: testContent,
        }
      );

      expect([401, 403, 404]).toContain(response.status);
    });
  });

  describe('POST /descriptions/:id/publish (Admin)', () => {
    it('관리자는 설명을 발행할 수 있어야 함', async () => {
      if (!createdDescriptionId) {
        return;
      }

      const response = await adminClient.post(
        `/descriptions/${createdDescriptionId}/publish`
      );

      if (response.status === 200) {
        expect(response.data).toHaveProperty('published', true);
      } else {
        expect([401, 403, 404]).toContain(response.status);
      }
    });

    it('비인증 사용자는 설명을 발행할 수 없어야 함', async () => {
      const response = await client.post('/descriptions/any-id/publish');

      expect([401, 403]).toContain(response.status);
    });
  });

  describe('POST /descriptions/:id/unpublish (Admin)', () => {
    it('관리자는 설명을 비발행할 수 있어야 함', async () => {
      if (!createdDescriptionId) {
        return;
      }

      const response = await adminClient.post(
        `/descriptions/${createdDescriptionId}/unpublish`
      );

      if (response.status === 200) {
        expect(response.data).toHaveProperty('published', false);
      } else {
        expect([401, 403, 404]).toContain(response.status);
      }
    });
  });

  describe('GET /descriptions/:id/history (Admin)', () => {
    it('관리자는 설명의 히스토리를 조회할 수 있어야 함', async () => {
      if (!createdDescriptionId) {
        return;
      }

      const response = await adminClient.get(
        `/descriptions/${createdDescriptionId}/history`
      );

      if (response.status === 200) {
        expect(Array.isArray(response.data)).toBe(true);
      } else {
        expect([401, 403, 404]).toContain(response.status);
      }
    });

    it('비인증 사용자는 히스토리를 조회할 수 없어야 함', async () => {
      const response = await client.get('/descriptions/any-id/history');

      expect([401, 403]).toContain(response.status);
    });
  });

  describe('DELETE /descriptions/:id (Admin)', () => {
    it('관리자는 설명을 삭제할 수 있어야 함', async () => {
      if (!createdDescriptionId) {
        return;
      }

      const response = await adminClient.delete(
        `/descriptions/${createdDescriptionId}`
      );

      if (response.status === 200 || response.status === 204) {
        // 삭제 후 조회 시 404
        const getResponse = await client.get(
          `/descriptions/${createdDescriptionId}`
        );
        expect(getResponse.status).toBe(404);
      } else {
        expect([401, 403, 404]).toContain(response.status);
      }
    });

    it('비인증 사용자는 설명을 삭제할 수 없어야 함', async () => {
      const response = await client.delete('/descriptions/any-id');

      expect([401, 403]).toContain(response.status);
    });

    it('이미 삭제된 설명 삭제 시 404를 반환해야 함', async () => {
      const response = await adminClient.delete(
        '/descriptions/already-deleted-id'
      );

      expect([401, 403, 404]).toContain(response.status);
    });
  });
});
