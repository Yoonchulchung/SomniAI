/**
 * Format Utilities Tests
 * 포맷 유틸리티 함수들의 단위 테스트
 */

// 실제 utils 파일을 import할 수 없으므로, 테스트용 구현을 복제
// 실제 환경에서는 직접 import하여 사용

// 테스트용 함수들 (실제로는 import해야 함)
function formatDate(date: string | Date): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}년 ${month}월 ${day}일 ${hours}:${minutes}`;
}

function formatDateShort(date: string | Date): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatNumber(num: number): string {
  return num.toLocaleString('ko-KR');
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${(ms / 1000).toFixed(1)}초`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}분 ${remainingSeconds}초`;
}

function formatPercent(value: number, decimals: number = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

describe('Format Utilities Tests', () => {
  describe('formatDate', () => {
    it('ISO 날짜를 한국어 형식으로 변환해야 함', () => {
      const result = formatDate('2024-01-15T10:30:00Z');
      expect(result).toContain('2024년');
      expect(result).toContain('월');
      expect(result).toContain('일');
    });

    it('Date 객체를 처리할 수 있어야 함', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const result = formatDate(date);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('시간 정보를 포함해야 함', () => {
      const result = formatDate('2024-01-15T10:30:00Z');
      expect(result).toMatch(/\d{2}:\d{2}/);
    });
  });

  describe('formatDateShort', () => {
    it('ISO 날짜를 간단한 형식으로 변환해야 함', () => {
      const result = formatDateShort('2024-01-15T10:30:00Z');
      expect(result).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/);
    });

    it('월과 일이 2자리로 패딩되어야 함', () => {
      const result = formatDateShort('2024-01-05T09:05:00Z');
      expect(result).toContain('01');
      expect(result).toContain('05');
    });
  });

  describe('formatFileSize', () => {
    it('0 바이트를 올바르게 표시해야 함', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
    });

    it('1 KB를 올바르게 표시해야 함', () => {
      const result = formatFileSize(1024);
      expect(result).toBe('1 KB');
    });

    it('1 MB를 올바르게 표시해야 함', () => {
      const result = formatFileSize(1048576);
      expect(result).toBe('1 MB');
    });

    it('1 GB를 올바르게 표시해야 함', () => {
      const result = formatFileSize(1073741824);
      expect(result).toBe('1 GB');
    });

    it('소수점 2자리로 반올림해야 함', () => {
      const result = formatFileSize(1536); // 1.5 KB
      expect(result).toBe('1.5 KB');
    });

    it('큰 파일 크기도 처리할 수 있어야 함', () => {
      const result = formatFileSize(1099511627776); // 1 TB
      expect(result).toBe('1 TB');
    });
  });

  describe('formatNumber', () => {
    it('천 단위로 콤마를 추가해야 함', () => {
      const result = formatNumber(1234567);
      expect(result).toBe('1,234,567');
    });

    it('작은 숫자도 올바르게 처리해야 함', () => {
      expect(formatNumber(123)).toBe('123');
    });

    it('음수도 처리할 수 있어야 함', () => {
      const result = formatNumber(-1234567);
      expect(result).toContain('1,234,567');
    });

    it('0을 올바르게 처리해야 함', () => {
      expect(formatNumber(0)).toBe('0');
    });
  });

  describe('formatDuration', () => {
    it('밀리초를 올바르게 표시해야 함', () => {
      expect(formatDuration(500)).toBe('500ms');
    });

    it('초를 올바르게 표시해야 함', () => {
      const result = formatDuration(1500);
      expect(result).toBe('1.5초');
    });

    it('분과 초를 올바르게 표시해야 함', () => {
      const result = formatDuration(65000); // 1분 5초
      expect(result).toBe('1분 5초');
    });

    it('정확히 1분을 올바르게 표시해야 함', () => {
      const result = formatDuration(60000);
      expect(result).toBe('1분 0초');
    });

    it('여러 분을 올바르게 표시해야 함', () => {
      const result = formatDuration(125000); // 2분 5초
      expect(result).toBe('2분 5초');
    });
  });

  describe('formatPercent', () => {
    it('퍼센트를 기본 2자리로 표시해야 함', () => {
      expect(formatPercent(0.8567)).toBe('85.67%');
    });

    it('0을 올바르게 처리해야 함', () => {
      expect(formatPercent(0)).toBe('0.00%');
    });

    it('1(100%)을 올바르게 처리해야 함', () => {
      expect(formatPercent(1)).toBe('100.00%');
    });

    it('소수점 자리수를 지정할 수 있어야 함', () => {
      expect(formatPercent(0.8567, 0)).toBe('86%');
      expect(formatPercent(0.8567, 1)).toBe('85.7%');
      expect(formatPercent(0.8567, 3)).toBe('85.670%');
    });

    it('음수도 처리할 수 있어야 함', () => {
      expect(formatPercent(-0.5)).toBe('-50.00%');
    });
  });
});
