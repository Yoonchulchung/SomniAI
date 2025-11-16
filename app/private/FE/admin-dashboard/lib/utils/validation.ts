/**
 * 입력 검증 유틸리티
 */

/**
 * 이메일 형식 검증
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 비밀번호 강도 검증
 * 최소 8자, 대문자, 소문자, 숫자 포함
 */
export function isStrongPassword(password: string): boolean {
  if (password.length < 8) return false;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  return hasUpperCase && hasLowerCase && hasNumber;
}

/**
 * 비밀번호 강도 메시지
 */
export function getPasswordStrengthMessage(password: string): string {
  if (password.length === 0) return '';
  if (password.length < 8) return '비밀번호는 최소 8자 이상이어야 합니다.';
  if (!/[A-Z]/.test(password)) return '대문자를 포함해야 합니다.';
  if (!/[a-z]/.test(password)) return '소문자를 포함해야 합니다.';
  if (!/\d/.test(password)) return '숫자를 포함해야 합니다.';
  return '강력한 비밀번호입니다.';
}

/**
 * URL 형식 검증
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 파일 확장자 검증
 */
export function hasValidExtension(filename: string, allowedExtensions: string[]): boolean {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext ? allowedExtensions.includes(ext) : false;
}

/**
 * 이미지 파일 검증
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * 파일 크기 검증
 */
export function isValidFileSize(file: File, maxSizeInMB: number): boolean {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return file.size <= maxSizeInBytes;
}

/**
 * 빈 문자열 또는 공백만 있는지 검증
 */
export function isEmpty(value: string | null | undefined): boolean {
  return !value || value.trim().length === 0;
}

/**
 * 숫자 범위 검증
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * 한글만 포함하는지 검증
 */
export function isKorean(text: string): boolean {
  const koreanRegex = /^[가-힣\s]+$/;
  return koreanRegex.test(text);
}

/**
 * 영문과 숫자만 포함하는지 검증
 */
export function isAlphanumeric(text: string): boolean {
  const alphanumericRegex = /^[a-zA-Z0-9]+$/;
  return alphanumericRegex.test(text);
}
