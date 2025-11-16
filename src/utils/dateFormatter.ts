/**
 * Date Formatter Utilities
 * ✅ ВИПРАВЛЕНО #48: централізоване форматування дат
 */

/**
 * Форматує дату в українському форматі
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('uk-UA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Форматує дату та час
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('uk-UA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Форматує дату для БД (ISO)
 */
export function formatDateForDB(date: Date = new Date()): string {
  return date.toISOString();
}

/**
 * Форматує відносний час ("2 години тому")
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'щойно';
  if (diffMins < 60) return `${diffMins} хв тому`;
  if (diffHours < 24) return `${diffHours} год тому`;
  if (diffDays < 7) return `${diffDays} дн тому`;

  return formatDate(d);
}

/**
 * Форматує тривалість (секунди → "1г 23хв")
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}г ${minutes}хв`;
  }
  return `${minutes}хв`;
}
