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
 */
export function validatePhoto(
  fileSize?: number,
  mimeType?: string,
  fileName?: string
): FileValidationResult {
  // Перевірка розміру
  if (fileSize && fileSize > MAX_FILE_SIZES.PHOTO) {
    const maxSizeMB = (MAX_FILE_SIZES.PHOTO / (1024 * 1024)).toFixed(0);
    const actualSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
    logger.warn('Photo file too large', { fileSize, maxSize: MAX_FILE_SIZES.PHOTO });
    return {
      isValid: false,
      error: `Фото занадто велике (${actualSizeMB} MB). Максимум ${maxSizeMB} MB.`,
      fileSize,
      fileSizeMB: actualSizeMB,
    };
  }

  // Перевірка MIME типу
  if (mimeType && !(ALLOWED_MIME_TYPES.PHOTO as readonly string[]).includes(mimeType)) {
    logger.warn('Invalid photo MIME type', { mimeType });
    return {
      isValid: false,
      error: 'Невірний формат фото. Дозволені: JPG, PNG, WEBP.',
    };
  }

  // Перевірка розширення
  if (fileName) {
    const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    if (!(ALLOWED_EXTENSIONS.PHOTO as readonly string[]).includes(ext)) {
      logger.warn('Invalid photo extension', { fileName, ext });
      return {
        isValid: false,
        error: `Невірне розширення файлу. Дозволені: ${ALLOWED_EXTENSIONS.PHOTO.join(', ')}`,
      };
    }
  }

  return {
    isValid: true,
    fileSize,
    fileSizeMB: fileSize ? (fileSize / (1024 * 1024)).toFixed(2) : undefined,
  };
}

/**
 * Валідація документа (PDF, EPUB, MOBI, FB2)
 */
export function validateDocument(
  fileSize?: number,
  mimeType?: string,
  fileName?: string
): FileValidationResult {
  // Перевірка розміру
  if (fileSize && fileSize > MAX_FILE_SIZES.DOCUMENT) {
    const maxSizeMB = (MAX_FILE_SIZES.DOCUMENT / (1024 * 1024)).toFixed(0);
    const actualSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
    logger.warn('Document file too large', { fileSize, maxSize: MAX_FILE_SIZES.DOCUMENT });
    return {
      isValid: false,
      error: `Файл занадто великий (${actualSizeMB} MB). Максимум ${maxSizeMB} MB.`,
      fileSize,
      fileSizeMB: actualSizeMB,
    };
  }

  // Перевірка розширення (обов'язково для документів)
  if (fileName) {
    const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    if (!(ALLOWED_EXTENSIONS.DOCUMENT as readonly string[]).includes(ext)) {
      logger.warn('Invalid document extension', { fileName, ext });
      return {
        isValid: false,
        error: `Невірний формат файлу. Дозволені: ${ALLOWED_EXTENSIONS.DOCUMENT.join(', ')}`,
      };
    }
  } else {
    return {
      isValid: false,
      error: 'Не вдалося визначити тип файлу. Будь ласка, надішліть файл з розширенням.',
    };
  }

  // Перевірка MIME типу (опціонально, бо Telegram не завжди правильно визначає)
  if (mimeType && !(ALLOWED_MIME_TYPES.DOCUMENT as readonly string[]).includes(mimeType)) {
    logger.debug('Document MIME type not in whitelist, but allowing based on extension', {
      mimeType,
      fileName,
    });
  }

  return {
    isValid: true,
    fileSize,
    fileSizeMB: fileSize ? (fileSize / (1024 * 1024)).toFixed(2) : undefined,
  };
}

/**
 * Валідація аудіо файлу
 */
export function validateAudio(
  fileSize?: number,
  mimeType?: string,
  fileName?: string
): FileValidationResult {
  // ✅ Без перевірки розміру - аудіокниги можуть бути дуже великими (до 5GB)

  // Перевірка MIME типу
  if (mimeType && !(ALLOWED_MIME_TYPES.AUDIO as readonly string[]).includes(mimeType)) {
    logger.warn('Invalid audio MIME type', { mimeType });
    return {
      isValid: false,
      error: 'Невірний формат аудіо. Дозволені: MP3, M4A, OGG.',
    };
  }

  // Перевірка розширення
  if (fileName) {
    const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    if (!(ALLOWED_EXTENSIONS.AUDIO as readonly string[]).includes(ext)) {
      logger.warn('Invalid audio extension', { fileName, ext });
      return {
        isValid: false,
        error: `Невірне розширення файлу. Дозволені: ${ALLOWED_EXTENSIONS.AUDIO.join(', ')}`,
      };
    }
  }

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
