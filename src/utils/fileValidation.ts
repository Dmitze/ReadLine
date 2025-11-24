/**
 * File Validation Utilities
 * Валідація завантажуваних файлів (розмір, тип, MIME)
 */

import { logger } from './logger';

// Максимальні розміри файлів (в байтах)
export const MAX_FILE_SIZES = {
  PHOTO: 10 * 1024 * 1024, // 10 MB
  DOCUMENT: 50 * 1024 * 1024, // 50 MB
  AUDIO: null, // Без ліміту - аудіокниги можуть бути великими (до 5GB)
} as const;

// Дозволені MIME типи
export const ALLOWED_MIME_TYPES = {
  PHOTO: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  DOCUMENT: [
    'application/pdf',
    'application/epub+zip',
    'application/x-mobipocket-ebook',
    'application/x-fictionbook+xml',
    'application/octet-stream', // для .mobi, .fb2
  ],
  AUDIO: ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/ogg'],
} as const;

// Дозволені розширення файлів
export const ALLOWED_EXTENSIONS = {
  PHOTO: ['.jpg', '.jpeg', '.png', '.webp'],
  DOCUMENT: ['.pdf', '.epub', '.mobi', '.fb2'],
  AUDIO: ['.mp3', '.m4a', '.ogg'],
} as const;

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  fileSize?: number;
  fileSizeMB?: string;
}

/**
 * Валідація фото
 * ✅ БЕЗ ВАЛІДАЦІЇ - принимаємо будь-які зображення без обмежень
 */
export function validatePhoto(
  fileSize?: number,
  mimeType?: string,
  fileName?: string
): FileValidationResult {
  // ✅ Приймаємо будь-які фото без перевірки розміру, типу чи розширення
  return {
    isValid: true,
    fileSize,
    fileSizeMB: fileSize ? (fileSize / (1024 * 1024)).toFixed(2) : undefined,
  };
}

/**
 * Валідація документа (PDF, EPUB, MOBI, FB2)
 * ✅ БЕЗ ВАЛІДАЦІЇ - принимаємо будь-які файли без обмежень
 */
export function validateDocument(
  fileSize?: number,
  mimeType?: string,
  fileName?: string
): FileValidationResult {
  // ✅ Приймаємо будь-які файли без перевірки розміру, типу чи розширення
  return {
    isValid: true,
    fileSize,
    fileSizeMB: fileSize ? (fileSize / (1024 * 1024)).toFixed(2) : undefined,
  };
}

/**
 * Валідація аудіо файлу
 * ✅ БЕЗ ВАЛІДАЦІЇ - принимаємо будь-які аудіо файли без обмежень
 */
export function validateAudio(
  fileSize?: number,
  mimeType?: string,
  fileName?: string
): FileValidationResult {
  // ✅ Приймаємо будь-які аудіо файли без перевірки розміру, типу чи розширення
  return {
    isValid: true,
    fileSize,
    fileSizeMB: fileSize ? (fileSize / (1024 * 1024)).toFixed(2) : undefined,
  };
}

/**
 * Форматування розміру файлу для відображення
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Перевірка чи файл є зображенням
 */
export function isImageFile(fileName?: string, mimeType?: string): boolean {
  if (mimeType && (ALLOWED_MIME_TYPES.PHOTO as readonly string[]).includes(mimeType)) {
    return true;
  }

  if (fileName) {
    const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    return (ALLOWED_EXTENSIONS.PHOTO as readonly string[]).includes(ext);
  }

  return false;
}

/**
 * Перевірка чи файл є документом
 */
export function isDocumentFile(fileName?: string, mimeType?: string): boolean {
  if (mimeType && (ALLOWED_MIME_TYPES.DOCUMENT as readonly string[]).includes(mimeType)) {
    return true;
  }

  if (fileName) {
    const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    return (ALLOWED_EXTENSIONS.DOCUMENT as readonly string[]).includes(ext);
  }

  return false;
}

/**
 * Перевірка чи файл є аудіо
 */
export function isAudioFile(fileName?: string, mimeType?: string): boolean {
  if (mimeType && (ALLOWED_MIME_TYPES.AUDIO as readonly string[]).includes(mimeType)) {
    return true;
  }

  if (fileName) {
    const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    return (ALLOWED_EXTENSIONS.AUDIO as readonly string[]).includes(ext);
  }

  return false;
}
