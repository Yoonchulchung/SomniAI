/**
 * Validation Utilities Tests
 * 검증 유틸리티 함수들의 단위 테스트
 */

// 테스트용 함수들 (실제로는 import해야 함)
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isStrongPassword(password: string): boolean {
  if (password.length < 8) return false;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  return hasUpperCase && hasLowerCase && hasNumber;
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function hasValidExtension(filename: string, allowedExtensions: string[]): boolean {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext ? allowedExtensions.includes(ext) : false;
}

function isEmpty(value: string | null | undefined): boolean {
  return !value || value.trim().length === 0;
}

function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

function isKorean(text: string): boolean {
  const koreanRegex = /^[가-힣\s]+$/;
  return koreanRegex.test(text);
}

function isAlphanumeric(text: string): boolean {
  const alphanumericRegex = /^[a-zA-Z0-9]+$/;
  return alphanumericRegex.test(text);
}

describe('Validation Utilities Tests', () => {
  describe('isValidEmail', () => {
    it('유효한 이메일을 인식해야 함', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.kr')).toBe(true);
      expect(isValidEmail('user+tag@example.com')).toBe(true);
    });

    it('잘못된 이메일을 거부해야 함', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('invalid@')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('user @domain.com')).toBe(false);
    });

    it('빈 문자열을 거부해야 함', () => {
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('isStrongPassword', () => {
    it('강력한 비밀번호를 인식해야 함', () => {
      expect(isStrongPassword('Password123')).toBe(true);
      expect(isStrongPassword('SecurePass1')).toBe(true);
      expect(isStrongPassword('MyP@ssw0rd')).toBe(true);
    });

    it('8자 미만의 비밀번호를 거부해야 함', () => {
      expect(isStrongPassword('Pass1')).toBe(false);
      expect(isStrongPassword('Abc123')).toBe(false);
    });

    it('대문자가 없는 비밀번호를 거부해야 함', () => {
      expect(isStrongPassword('password123')).toBe(false);
    });

    it('소문자가 없는 비밀번호를 거부해야 함', () => {
      expect(isStrongPassword('PASSWORD123')).toBe(false);
    });

    it('숫자가 없는 비밀번호를 거부해야 함', () => {
      expect(isStrongPassword('PasswordOnly')).toBe(false);
    });

    it('빈 문자열을 거부해야 함', () => {
      expect(isStrongPassword('')).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    it('유효한 URL을 인식해야 함', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://example.com')).toBe(true);
      expect(isValidUrl('https://example.com/path?query=value')).toBe(true);
      expect(isValidUrl('ftp://files.example.com')).toBe(true);
    });

    it('잘못된 URL을 거부해야 함', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('')).toBe(false);
      expect(isValidUrl('just some text')).toBe(false);
    });

    it('프로토콜이 없는 URL을 거부해야 함', () => {
      expect(isValidUrl('example.com')).toBe(false);
    });
  });

  describe('hasValidExtension', () => {
    it('허용된 확장자를 인식해야 함', () => {
      expect(hasValidExtension('file.jpg', ['jpg', 'png'])).toBe(true);
      expect(hasValidExtension('file.PNG', ['jpg', 'png'])).toBe(true); // 대소문자 무시
      expect(hasValidExtension('document.pdf', ['pdf', 'doc'])).toBe(true);
    });

    it('허용되지 않은 확장자를 거부해야 함', () => {
      expect(hasValidExtension('file.exe', ['jpg', 'png'])).toBe(false);
      expect(hasValidExtension('file.txt', ['jpg', 'png'])).toBe(false);
    });

    it('확장자가 없는 파일을 거부해야 함', () => {
      expect(hasValidExtension('file', ['jpg', 'png'])).toBe(false);
    });

    it('여러 점이 있는 파일명도 처리해야 함', () => {
      expect(hasValidExtension('my.file.name.jpg', ['jpg', 'png'])).toBe(true);
    });
  });

  describe('isEmpty', () => {
    it('빈 문자열을 인식해야 함', () => {
      expect(isEmpty('')).toBe(true);
      expect(isEmpty('   ')).toBe(true); // 공백만
      expect(isEmpty('\t\n')).toBe(true); // 탭과 개행
    });

    it('null과 undefined를 빈 값으로 인식해야 함', () => {
      expect(isEmpty(null)).toBe(true);
      expect(isEmpty(undefined)).toBe(true);
    });

    it('유효한 문자열을 인식해야 함', () => {
      expect(isEmpty('text')).toBe(false);
      expect(isEmpty(' text ')).toBe(false);
    });
  });

  describe('isInRange', () => {
    it('범위 내 값을 인식해야 함', () => {
      expect(isInRange(5, 0, 10)).toBe(true);
      expect(isInRange(0, 0, 10)).toBe(true); // 최소값
      expect(isInRange(10, 0, 10)).toBe(true); // 최대값
    });

    it('범위 밖 값을 거부해야 함', () => {
      expect(isInRange(-1, 0, 10)).toBe(false);
      expect(isInRange(11, 0, 10)).toBe(false);
    });

    it('음수 범위도 처리해야 함', () => {
      expect(isInRange(-5, -10, 0)).toBe(true);
      expect(isInRange(-11, -10, 0)).toBe(false);
    });
  });

  describe('isKorean', () => {
    it('한글만 있는 문자열을 인식해야 함', () => {
      expect(isKorean('안녕하세요')).toBe(true);
      expect(isKorean('테스트')).toBe(true);
      expect(isKorean('한글 문자열')).toBe(true); // 공백 포함
    });

    it('한글이 아닌 문자를 거부해야 함', () => {
      expect(isKorean('Hello')).toBe(false);
      expect(isKorean('안녕123')).toBe(false);
      expect(isKorean('테스트Test')).toBe(false);
      expect(isKorean('한글!')).toBe(false);
    });

    it('빈 문자열을 거부해야 함', () => {
      expect(isKorean('')).toBe(false);
    });
  });

  describe('isAlphanumeric', () => {
    it('영문과 숫자만 있는 문자열을 인식해야 함', () => {
      expect(isAlphanumeric('abc123')).toBe(true);
      expect(isAlphanumeric('ABC')).toBe(true);
      expect(isAlphanumeric('123')).toBe(true);
      expect(isAlphanumeric('Test123')).toBe(true);
    });

    it('특수문자를 포함한 문자열을 거부해야 함', () => {
      expect(isAlphanumeric('abc-123')).toBe(false);
      expect(isAlphanumeric('test@123')).toBe(false);
      expect(isAlphanumeric('hello world')).toBe(false); // 공백
    });

    it('한글을 거부해야 함', () => {
      expect(isAlphanumeric('한글123')).toBe(false);
    });

    it('빈 문자열을 거부해야 함', () => {
      expect(isAlphanumeric('')).toBe(false);
    });
  });
});
