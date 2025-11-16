/**
 * 날짜 포맷팅 유틸리티
 */

/**
 * ISO 날짜를 한국어 형식으로 변환
 * @example formatDate('2024-01-15T10:30:00Z') => '2024년 1월 15일 10:30'
 */
export function formatDate(date: string | Date): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}년 ${month}월 ${day}일 ${hours}:${minutes}`;
}

/**
 * ISO 날짜를 간단한 형식으로 변환
 * @example formatDateShort('2024-01-15T10:30:00Z') => '2024-01-15 10:30'
 */
export function formatDateShort(date: string | Date): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * 상대 시간 표시
 * @example formatRelativeTime('2024-01-15T10:30:00Z') => '2시간 전'
 */
export function formatRelativeTime(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return `${diffSec}초 전`;
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;
  return formatDateShort(d);
}

/**
 * 파일 크기를 읽기 쉬운 형식으로 변환
 * @example formatFileSize(1024) => '1 KB'
 * @example formatFileSize(1048576) => '1 MB'
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * 숫자를 천단위로 콤마 구분
 * @example formatNumber(1234567) => '1,234,567'
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('ko-KR');
}

/**
 * 밀리초를 읽기 쉬운 형식으로 변환
 * @example formatDuration(1500) => '1.5초'
 * @example formatDuration(65000) => '1분 5초'
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${(ms / 1000).toFixed(1)}초`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}분 ${remainingSeconds}초`;
}

/**
 * 퍼센트 포맷팅
 * @example formatPercent(0.8567) => '85.67%'
 */
export function formatPercent(value: number, decimals: number = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * JSON을 보기 좋게 포맷팅
 */
export function formatJSON(obj: any): string {
  return JSON.stringify(obj, null, 2);
}
