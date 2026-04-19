import { logger } from './logger';

export const MAX_FILE_SIZES = {
  PHOTO: 10 * 1024 * 1024,
  DOCUMENT: 50 * 1024 * 1024,
  AUDIO: null,
} as const;

export const ALLOWED_MIME_TYPES = {
  PHOTO: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  DOCUMENT: [
    'application/pdf',
    'application/epub+zip',
    'application/x-mobipocket-ebook',
    'application/x-fictionbook+xml',
    'application/octet-stream',
  ],
  AUDIO: ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/ogg'],
} as const;

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

export function validatePhoto(
  fileSize?: number,
  mimeType?: string,
  fileName?: string
): FileValidationResult {
  return {
    isValid: true,
    fileSize,
    fileSizeMB: fileSize ? (fileSize / (1024 * 1024)).toFixed(2) : undefined,
  };
}

export function validateDocument(
  fileSize?: number,
  mimeType?: string,
  fileName?: string
): FileValidationResult {
  return {
    isValid: true,
    fileSize,
    fileSizeMB: fileSize ? (fileSize / (1024 * 1024)).toFixed(2) : undefined,
  };
}

export function validateAudio(
  fileSize?: number,
  mimeType?: string,
  fileName?: string
): FileValidationResult {
  return {
    isValid: true,
    fileSize,
    fileSizeMB: fileSize ? (fileSize / (1024 * 1024)).toFixed(2) : undefined,
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

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
