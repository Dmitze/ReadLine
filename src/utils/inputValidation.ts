/**
 * Input Validation Utilities
 * ✅ ВИПРАВЛЕНО #59: централізована валідація вхідних даних
 */

/**
 * Валідує текстовий input
 */
export function validateTextInput(text: string | undefined, minLength: number = 1, maxLength: number = 5000): {
  isValid: boolean;
  error?: string;
  sanitized?: string;
} {
  if (!text || typeof text !== 'string') {
    return { isValid: false, error: 'Текст не може бути порожнім' };
  }

  const trimmed = text.trim();

  if (trimmed.length < minLength) {
    return { isValid: false, error: `Текст занадто короткий (мінімум ${minLength} символів)` };
  }

  if (trimmed.length > maxLength) {
    return { isValid: false, error: `Текст занадто довгий (максимум ${maxLength} символів)` };
  }

  // Видаляємо небезпечні символи
  const sanitized = trimmed.replace(/[<>]/g, '');

  return { isValid: true, sanitized };
}

/**
 * Валідує URL
 */
export function validateUrl(url: string | undefined): {
  isValid: boolean;
  error?: string;
} {
  if (!url || typeof url !== 'string') {
    return { isValid: false, error: 'URL не може бути порожнім' };
  }

  const trimmed = url.trim();

  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return { isValid: false, error: 'URL повинен починатися з http:// або https://' };
  }

  try {
    new URL(trimmed);
    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Некоректний URL' };
  }
}

/**
 * Валідує число
 */
export function validateNumber(value: any, min?: number, max?: number): {
  isValid: boolean;
  error?: string;
  number?: number;
} {
  const num = Number(value);

  if (isNaN(num)) {
    return { isValid: false, error: 'Некоректне число' };
  }

  if (min !== undefined && num < min) {
    return { isValid: false, error: `Число повинно бути не менше ${min}` };
  }

  if (max !== undefined && num > max) {
    return { isValid: false, error: `Число повинно бути не більше ${max}` };
  }

  return { isValid: true, number: num };
}

/**
 * Валідує рейтинг (1-5)
 */
export function validateRating(rating: any): {
  isValid: boolean;
  error?: string;
  rating?: number;
} {
  return validateNumber(rating, 1, 5);
}
