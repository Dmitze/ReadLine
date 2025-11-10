/**
 * Утиліти для роботи з форматами книг
 */

import { Book } from '../database/models';

export interface BookFormats {
  hasPDF: boolean;
  hasLink: boolean;
  hasAudio: boolean;
  formats: string[]; // ['pdf', 'link', 'audio']
}

/**
 * Визначити доступні формати книги
 */
export function getBookFormats(book: Book): BookFormats {
  const formats: string[] = [];
  
  const hasPDF = !!((book as any).pdf_file_id || (book.file_type === 'file' && book.file_url));
  const hasLink = !!((book as any).external_link || (book.file_type === 'link' && book.file_url));
  const hasAudio = !!(book as any).audio_file_id;
  
  if (hasPDF) formats.push('pdf');
  if (hasLink) formats.push('link');
  if (hasAudio) formats.push('audio');
  
  return {
    hasPDF,
    hasLink,
    hasAudio,
    formats
  };
}

/**
 * Отримати текстовий опис доступних форматів
 */
export function getFormatsDescription(book: Book): string {
  const { hasPDF, hasLink, hasAudio } = getBookFormats(book);
  const parts: string[] = [];
  
  if (hasPDF) parts.push('📥 PDF');
  if (hasLink) parts.push('🔗 Онлайн');
  if (hasAudio) {
    const duration = (book as any).audio_duration 
      ? ` (${formatDuration((book as any).audio_duration)})` 
      : '';
    parts.push(`🎧 Аудіо${duration}`);
  }
  
  return parts.length > 0 ? parts.join(' • ') : '📖 Тільки фізична копія';
}

/**
 * Форматувати тривалість аудіо
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours} год ${minutes} хв`;
  }
  return `${minutes} хв`;
}

/**
 * Перевірити чи книга має хоч один електронний формат
 */
export function hasAnyDigitalFormat(book: Book): boolean {
  const { hasPDF, hasLink, hasAudio } = getBookFormats(book);
  return hasPDF || hasLink || hasAudio;
}
