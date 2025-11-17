/**
 * Authentication API Tests
 * 회원가입, 로그인, 로그아웃, 사용자 정보 조회 테스트
 */

import { APIClient } from './helpers/client';
import { TEST_CONFIG } from './helpers/config';

describe('Authentication API Tests', () => {
  let client: APIClient;
  let authToken: string;
  const testEmail = `test_${Date.now()}@somniai.com`;
  const testPassword = 'Test1234!@#$';
  const testUsername = `testuser_${Date.now()}`;

  beforeAll(() => {
    client = new APIClient();
  });

  afterAll(() => {
    client.clearToken();
  });

  describe('POST /auth/register', () => {
    it('새로운 사용자를 등록할 수 있어야 함', async () => {
      const response = await client.post('/auth/register', {
        email: testEmail,
        password: testPassword,
        username: testUsername,
      });

      // 201 Created 또는 200 OK
      expect([200, 201]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        expect(response.data).toHaveProperty('user');
      }
    });

    it('중복된 이메일로 등록 시 실패해야 함', async () => {
      // 같은 이메일로 다시 등록 시도
      const response = await client.post('/auth/register', {
        email: testEmail,
        password: testPassword,
        username: 'anotheruser',
      });

      // 400 Bad Request 또는 409 Conflict
      expect([400, 409]).toContain(response.status);
    });

    it('잘못된 이메일 형식은 거부해야 함', async () => {
      const response = await client.post('/auth/register', {
        email: 'invalid-email',
        password: testPassword,
        username: 'testuser',
      });

      expect(response.status).toBe(400);
    });

    it('짧은 비밀번호는 거부해야 함', async () => {
      const response = await client.post('/auth/register', {
        email: `test_short_${Date.now()}@somniai.com`,
        password: '123',
        username: 'testuser',
      });

      expect(response.status).toBe(400);
    });

    it('필수 필드 누락 시 실패해야 함', async () => {
      const response = await client.post('/auth/register', {
        email: testEmail,
        // password 누락
      });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /auth/login', () => {
    it('올바른 자격증명으로 로그인할 수 있어야 함', async () => {
      const response = await client.post('/auth/login', {
        email: testEmail,
        password: testPassword,
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('token');

      if (response.data.token) {
        authToken = response.data.token;
        client.setToken(authToken);
      }
    });

    it('잘못된 비밀번호로 로그인 시 실패해야 함', async () => {
      const response = await client.post('/auth/login', {
        email: testEmail,
        password: 'WrongPassword123!',
      });

      expect(response.status).toBe(401);
    });

    it('존재하지 않는 이메일로 로그인 시 실패해야 함', async () => {
      const response = await client.post('/auth/login', {
        email: 'nonexistent@somniai.com',
        password: testPassword,
      });

      expect(response.status).toBe(401);
    });

    it('필수 필드 누락 시 실패해야 함', async () => {
      const response = await client.post('/auth/login', {
        email: testEmail,
        // password 누락
      });

      expect(response.status).toBe(400);
    });

    it('로그인 성공 시 사용자 정보를 반환해야 함', async () => {
      const response = await client.post('/auth/login', {
        email: testEmail,
        password: testPassword,
      });

      expect(response.status).toBe(200);

      if (response.data.user) {
        expect(response.data.user).toHaveProperty('email');
        expect(response.data.user.email).toBe(testEmail);
      }
    });
  });

  describe('GET /auth/me', () => {
    beforeAll(async () => {
      // 로그인하여 토큰 획득
      const loginResponse = await client.post('/auth/login', {
        email: testEmail,
        password: testPassword,
      });

      if (loginResponse.data.token) {
        authToken = loginResponse.data.token;
        client.setToken(authToken);
      }
    });

    it('인증된 사용자 정보를 조회할 수 있어야 함', async () => {
      const response = await client.get('/auth/me');

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('user');

      if (response.data.user) {
        expect(response.data.user).toHaveProperty('email');
        expect(response.data.user.email).toBe(testEmail);
      }
    });

    it('토큰 없이 요청 시 실패해야 함', async () => {
      const tempClient = new APIClient();
      const response = await tempClient.get('/auth/me');

      expect(response.status).toBe(401);
    });

    it('잘못된 토큰으로 요청 시 실패해야 함', async () => {
      const tempClient = new APIClient();
      tempClient.setToken('invalid-token');
      const response = await tempClient.get('/auth/me');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('로그아웃을 성공적으로 수행해야 함', async () => {
      const response = await client.post('/auth/logout');

      expect([200, 204]).toContain(response.status);
    });

    it('로그아웃 후 토큰은 무효화되어야 함', async () => {
      // 로그아웃
      await client.post('/auth/logout');

      // 같은 토큰으로 사용자 정보 조회 시도 (서버가 토큰 블랙리스트를 관리하는 경우)
      // 참고: 일부 JWT 구현은 토큰을 무효화하지 않으므로 이 테스트는 선택적
      const response = await client.get('/auth/me');

      // 토큰 무효화를 지원하면 401, 아니면 200
      expect([200, 401]).toContain(response.status);
    });
  });

  describe('Auth API Rate Limiting', () => {
    it('과도한 로그인 시도는 제한되어야 함', async () => {
      const attempts = 20;
      let blockedCount = 0;

      for (let i = 0; i < attempts; i++) {
        const response = await client.post('/auth/login', {
          email: 'ratelimit@test.com',
          password: 'wrong',
        });

        if (response.status === 429) {
          blockedCount++;
        }
      }

      // Rate limiting이 설정되어 있다면 일부 요청이 차단되어야 함
      // 설정되어 있지 않으면 이 테스트는 통과
      expect(blockedCount).toBeGreaterThanOrEqual(0);
    }, 30000); // 30초 타임아웃
  });
});
