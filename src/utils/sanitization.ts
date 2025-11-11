/**
 * Sanitization Utilities - санітизація та очищення вхідних даних
 * Захист від SQL injection, XSS та інших атак
 */

/**
 * Санітизація SQL параметрів
 * Видаляє небезпечні символи для SQL запитів
 */
export function sanitizeSqlParam(value: string): string {
  if (!value) return '';
  
  // Видаляємо SQL спецсимволи
  return value
    .replace(/['";\\]/g, '') // Видаляємо лапки та слеші
    .replace(/--/g, '') // Видаляємо SQL коментарі
    .replace(/\/\*/g, '') // Видаляємо початок блокового коментаря
    .replace(/\*\//g, '') // Видаляємо кінець блокового коментаря
    .trim();
}

/**
 * Санітизація тегів
 * Дозволяє тільки букви, цифри, пробіли та дефіси
 */
export function sanitizeTag(tag: string): string {
  if (!tag) return '';
  
  return tag
    .replace(/[^a-zA-Zа-яА-ЯіІїЇєЄґҐ0-9\s\-]/g, '')
    .trim()
    .substring(0, 50); // Обмежуємо довжину
}

/**
 * Санітизація пошукового запиту
 * Видаляє небезпечні символи але зберігає пробіли
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query) return '';
  
  return query
    .replace(/[<>'"]/g, '') // Видаляємо HTML/SQL спецсимволи
    .replace(/[;\\]/g, '') // Видаляємо SQL спецсимволи
    .trim()
    .substring(0, 100); // Обмежуємо довжину
}

/**
 * Санітизація імені користувача
 */
export function sanitizeUsername(username: string): string {
  if (!username) return '';
  
  return username
    .replace(/[^a-zA-Z0-9_]/g, '') // Тільки букви, цифри та підкреслення
    .trim()
    .substring(0, 32);
}

/**
 * Санітизація URL
 * Перевіряє чи URL безпечний
 */
export function sanitizeUrl(url: string): string | null {
  if (!url) return null;
  
  try {
    const urlObj = new URL(url);
    
    // Дозволяємо тільки http та https
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return null;
    }
    
    // Перевіряємо чи немає небезпечних символів
    if (url.includes('<') || url.includes('>') || url.includes('"')) {
      return null;
    }
    
    return url;
  } catch {
    return null;
  }
}

/**
 * Екранування HTML
 * Захист від XSS атак
 */
export function escapeHtml(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Екранування Markdown
 * Захист від Markdown injection
 */
export function escapeMarkdown(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}

/**
 * Санітизація тексту повідомлення
 * Видаляє HTML теги та обмежує довжину
 */
export function sanitizeMessage(message: string, maxLength: number = 4000): string {
  if (!message) return '';
  
  return message
    .replace(/<[^>]*>/g, '') // Видаляємо HTML теги
    .replace(/[<>]/g, '') // Видаляємо < та >
    .trim()
    .substring(0, maxLength);
}

/**
 * Валідація та санітизація номера телефону
 */
export function sanitizePhoneNumber(phone: string): string | null {
  if (!phone) return null;
  
  // Видаляємо всі символи крім цифр та +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Перевіряємо формат
  const phoneRegex = /^(\+?38)?0\d{9}$/;
  if (!phoneRegex.test(cleaned)) {
    return null;
  }
  
  return cleaned;
}

/**
 * Санітизація email
 */
export function sanitizeEmail(email: string): string | null {
  if (!email) return null;
  
  const cleaned = email.trim().toLowerCase();
  
  // Простий regex для email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleaned)) {
    return null;
  }
  
  return cleaned;
}

/**
 * Санітизація числового значення
 */
export function sanitizeNumber(value: any, min?: number, max?: number): number | null {
  const num = Number(value);
  
  if (isNaN(num)) {
    return null;
  }
  
  if (min !== undefined && num < min) {
    return null;
  }
  
  if (max !== undefined && num > max) {
    return null;
  }
  
  return num;
}

/**
 * Санітизація булевого значення
 */
export function sanitizeBoolean(value: any): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1';
  }
  
  if (typeof value === 'number') {
    return value !== 0;
  }
  
  return false;
}

/**
 * Санітизація масиву
 * Видаляє дублікати та порожні значення
 */
export function sanitizeArray<T>(arr: T[], maxLength?: number): T[] {
  if (!Array.isArray(arr)) {
    return [];
  }
  
  // Видаляємо дублікати та порожні значення
  const unique = [...new Set(arr)].filter(item => 
    item !== null && item !== undefined && item !== ''
  );
  
  // Обмежуємо довжину якщо потрібно
  if (maxLength !== undefined) {
    return unique.slice(0, maxLength);
  }
  
  return unique;
}

/**
 * Комплексна санітизація об'єкта
 * Рекурсивно очищує всі поля
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      continue;
    }
    
    if (typeof value === 'string') {
      sanitized[key] = sanitizeMessage(value);
    } else if (typeof value === 'number') {
      sanitized[key] = value;
    } else if (typeof value === 'boolean') {
      sanitized[key] = value;
    } else if (Array.isArray(value)) {
      sanitized[key] = sanitizeArray(value);
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    }
  }
  
  return sanitized as T;
}
