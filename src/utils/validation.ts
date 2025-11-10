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
 */
export function validateBookData(
  data: Partial<Omit<Book, 'id' | 'created_at'>>
): ValidationResult {
  const errors: string[] = [];

  // Обов'язкові поля
  if (!data.title || data.title.trim().length === 0) {
    errors.push('Назва книги обов\'язкова');
  } else if (data.title.length > 200) {
    errors.push('Назва книги занадто довга (максимум 200 символів)');
  }

  if (!data.author || data.author.trim().length === 0) {
    errors.push('Автор обов\'язковий');
  } else if (data.author.length > 100) {
    errors.push('Ім\'я автора занадто довге (максимум 100 символів)');
  }

  if (!data.genre || data.genre.trim().length === 0) {
    errors.push('Жанр обов\'язковий');
  }

  if (!data.description || data.description.trim().length === 0) {
    errors.push('Опис обов\'язковий');
  } else if (data.description.length > 1000) {
    errors.push('Опис занадто довгий (максимум 1000 символів)');
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

// validateRequestData видалено - більше не використовуємо заявки

/**
 * Валідація даних відгуку
 */
export function validateReviewData(
  data: Partial<Omit<Review, 'id' | 'created_at'>>
): ValidationResult {
  const errors: string[] = [];

  if (!data.book_id || data.book_id <= 0) {
    errors.push('ID книги обов\'язковий');
  }

  if (!data.user_id || data.user_id <= 0) {
    errors.push('ID користувача обов\'язковий');
  }

  if (!data.rating || data.rating < 1 || data.rating > 5) {
    errors.push('Рейтинг має бути від 1 до 5');
  }

  if (data.comment) {
    if (data.comment.length > 500) {
      errors.push('Коментар занадто довгий (максимум 500 символів)');
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
 */
export function validateSearchQuery(query: string): ValidationResult {
  const errors: string[] = [];

  if (!query || query.trim().length === 0) {
    errors.push('Пошуковий запит не може бути порожнім');
  }

  if (query.length < 2) {
    errors.push('Пошуковий запит занадто короткий (мінімум 2 символи)');
  }

  if (query.length > 100) {
    errors.push('Пошуковий запит занадто довгий (максимум 100 символів)');
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
