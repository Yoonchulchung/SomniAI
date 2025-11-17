/**
 * Test Configuration
 * API 서버 URL 및 테스트 설정
 */

export const TEST_CONFIG = {
  // API 서버 URL (환경변수로 설정 가능)
  API_BASE_URL: process.env.TEST_API_URL || 'http://localhost:4000/api',

  // 테스트 타임아웃
  TIMEOUT: 10000,

  // 테스트용 사용자 정보
  TEST_USER: {
    email: 'test@somniai.com',
    password: 'Test1234!@#$',
    username: 'testuser'
  },

  // 테스트용 관리자 정보
  TEST_ADMIN: {
    email: 'admin@somniai.com',
    password: 'Admin1234!@#$',
    username: 'admin'
  }
};

export default TEST_CONFIG;
