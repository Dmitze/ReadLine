/**
 * Validation Utilities - валідація вхідних даних
 */

import { Book, Review } from '../database/models';

/**
 * Результат валідації
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Валідація даних книги
 * ✅ ВИПРАВЛЕНО: використовуємо константи
 */
export function validateBookData(
  data: Partial<Omit<Book, 'id' | 'created_at'>>
): ValidationResult {
  const { VALIDATION } = require('../constants');
  const errors: string[] = [];

  // Обов'язкові поля
  if (!data.title || data.title.trim().length === 0) {
    errors.push('Назва книги обов\'язкова');
  } else if (data.title.length < VALIDATION.TITLE_MIN) {
    errors.push(`Назва занадто коротка (мінімум ${VALIDATION.TITLE_MIN} символи)`);
  } else if (data.title.length > VALIDATION.TITLE_MAX) {
    errors.push(`Назва книги занадто довга (максимум ${VALIDATION.TITLE_MAX} символів)`);
  }

  if (!data.author || data.author.trim().length === 0) {
    errors.push('Автор обов\'язковий');
  } else if (data.author.length < VALIDATION.AUTHOR_MIN) {
    errors.push(`Ім\'я автора занадто коротке (мінімум ${VALIDATION.AUTHOR_MIN} символи)`);
  } else if (data.author.length > VALIDATION.AUTHOR_MAX) {
    errors.push(`Ім\'я автора занадто довге (максимум ${VALIDATION.AUTHOR_MAX} символів)`);
  }

  if (!data.genre || data.genre.trim().length === 0) {
    errors.push('Жанр обов\'язковий');
  }

  if (!data.description || data.description.trim().length === 0) {
    errors.push('Опис обов\'язковий');
  } else if (data.description.length < VALIDATION.DESCRIPTION_MIN) {
    errors.push(`Опис занадто короткий (мінімум ${VALIDATION.DESCRIPTION_MIN} символів)`);
  } else if (data.description.length > VALIDATION.DESCRIPTION_MAX) {
    errors.push(`Опис занадто довгий (максимум ${VALIDATION.DESCRIPTION_MAX} символів)`);
  }

  if (!data.photo_file_id || data.photo_file_id.trim().length === 0) {
    errors.push('Фото обкладинки обов\'язкове');
  }

  // Валідація file_type
  if (data.file_type && !['physical', 'link', 'file'].includes(data.file_type)) {
    errors.push('Невірний тип файлу');
  }

  // Якщо тип 'link', перевіряємо URL
  if (data.file_type === 'link' && data.file_url) {
    if (!isValidUrl(data.file_url)) {
      errors.push('Невірний формат посилання');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Валідація даних відгуку
 * ✅ ВИПРАВЛЕНО: використовуємо константи
 */
export function validateReviewData(
  data: Partial<Omit<Review, 'id' | 'created_at'>>
): ValidationResult {
  const { VALIDATION } = require('../constants');
  const errors: string[] = [];

  if (!data.book_id || data.book_id <= 0) {
    errors.push('ID книги обов\'язковий');
  }

  if (!data.user_id || data.user_id <= 0) {
    errors.push('ID користувача обов\'язковий');
  }

  if (!data.rating || data.rating < VALIDATION.RATING_MIN || data.rating > VALIDATION.RATING_MAX) {
    errors.push(`Рейтинг має бути від ${VALIDATION.RATING_MIN} до ${VALIDATION.RATING_MAX}`);
  }

  if (data.comment) {
    if (data.comment.length > VALIDATION.COMMENT_MAX) {
      errors.push(`Коментар занадто довгий (максимум ${VALIDATION.COMMENT_MAX} символів)`);
    }
    if (data.comment.trim().length === 0) {
      errors.push('Коментар не може бути порожнім');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Валідація пошукового запиту
 * ✅ ВИПРАВЛЕНО: використовуємо константи
 */
export function validateSearchQuery(query: string): ValidationResult {
  const { CONFIG } = require('../constants');
  const errors: string[] = [];

  if (!query || query.trim().length === 0) {
    errors.push('Пошуковий запит не може бути порожнім');
  }

  if (query.length < CONFIG.MIN_SEARCH_LENGTH) {
    errors.push(`Пошуковий запит занадто короткий (мінімум ${CONFIG.MIN_SEARCH_LENGTH} символи)`);
  }

  if (query.length > CONFIG.MAX_SEARCH_LENGTH) {
    errors.push(`Пошуковий запит занадто довгий (максимум ${CONFIG.MAX_SEARCH_LENGTH} символів)`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Перевірка чи рядок є валідним URL
 */
export function isValidUrl(url: string): boolean {
  try {
    const urlObject = new URL(url);
    return urlObject.protocol === 'http:' || urlObject.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Перевірка чи рядок є валідним номером телефону
 */
export function isValidPhoneNumber(phone: string): boolean {
  // Український формат: +380501234567, 0501234567, 050-123-45-67
  const phoneRegex = /^(\+?38)?0\d{9}$|^(\+?38)?0\d{2}-\d{3}-\d{2}-\d{2}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * Санітизація тексту (видалення небезпечних символів)
 */
export function sanitizeText(text: string): string {
  return text
    .trim()
    .replace(/<[^>]*>/g, '') // Видаляємо HTML теги
    .replace(/[<>]/g, ''); // Видаляємо < та >
}

/**
 * Обрізання тексту до максимальної довжини
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
}
