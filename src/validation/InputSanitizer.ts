/**
 * Input Sanitization System
 * REFACTOR-014: Comprehensive Input Validation
 */

export interface SanitizeOptions {
  trim?: boolean;
  lowercase?: boolean;
  uppercase?: boolean;
  removeHtml?: boolean;
  removeSpecialChars?: boolean;
  maxLength?: number;
  replaceSpaces?: boolean;
}

export class InputSanitizer {
  private static readonly htmlTags = /<[^>]*>/g;
  private static readonly scriptTags = /<script[^>]*>.*?<\/script>/gi;
  private static readonly eventHandlers = /on\w+\s*=/gi;
  private static readonly dangerousProtocols = /javascript:|data:|vbscript:/gi;
  private static readonly sqlComments = /(--|#|\/\*|\*\/)/g;
  private static readonly sqlInjectionPatterns = [
    /('\s*(OR|AND)\s*'1'\s*=\s*'1)/gi,
    /("\s*(OR|AND)\s*"1"\s*=\s*"1)/gi,
    /(;\s*(DROP|DELETE|INSERT|UPDATE|CREATE|ALTER)\s)/gi,
    /(\bUNION\b.*\bSELECT\b)/gi,
    /(\bEXEC\b|\bEXECUTE\b)/gi,
  ];

  /**
   * Санітизувати рядок
   */
  static sanitizeString(value: string, options: SanitizeOptions = {}): string {
    let result = String(value);

    // Видалити HTML теги та небезпечні атрибути
    if (options.removeHtml !== false) {
      result = result
        .replace(this.scriptTags, '')
        .replace(this.eventHandlers, '')
        .replace(this.dangerousProtocols, '')
        .replace(this.htmlTags, '');
    }

    // Обрізати
    if (options.trim !== false) {
      result = result.trim();
    }

    // Перетворити регістр
    if (options.uppercase) {
      result = result.toUpperCase();
    } else if (options.lowercase) {
      result = result.toLowerCase();
    }

    // Обмежити довжину
    if (options.maxLength) {
      result = result.substring(0, options.maxLength);
    }

    // Замінити множинні пробіли
    if (options.replaceSpaces) {
      result = result.replace(/\s+/g, ' ');
    }

    return result;
  }

  /**
   * Санітизувати для безпечного використання в БД
   */
  static sanitizeForDatabase(value: string): string {
    return this.sanitizeString(value, {
      removeHtml: true,
      trim: true,
      replaceSpaces: true
    })
      .replace(/'/g, "''")
      .replace(/\\/g, '\\\\');
  }

  /**
   * Санітизувати для HTML виводу
   */
  static sanitizeForHtml(value: string): string {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  /**
   * Санітизувати для URL
   */
  static sanitizeForUrl(value: string): string {
    try {
      const url = new URL(value);
      return url.toString();
    } catch {
      return encodeURI(value);
    }
  }

  /**
   * Санітизувати для JSON
   */
  static sanitizeForJson(value: any): string {
    return JSON.stringify(value)
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\//g, '\\/');
  }

  /**
   * Перевірити на SQL injection
   */
  static checkSqlInjection(value: string): boolean {
    return this.sqlInjectionPatterns.some(pattern => pattern.test(value));
  }

  /**
   * Перевірити на XSS
   */
  static checkXss(value: string): boolean {
    const xssPatterns = [
      this.scriptTags,
      this.eventHandlers,
      this.dangerousProtocols,
      /<iframe[^>]*>/gi,
      /<object[^>]*>/gi,
      /<embed[^>]*>/gi,
      /javascript:/gi,
      /data:text\/html/gi,
    ];

    return xssPatterns.some(pattern => pattern.test(value));
  }

  /**
   * Санітизувати об'єкт
   */
  static sanitizeObject(obj: any, options: SanitizeOptions = {}): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.sanitizeString(obj, options);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item, options));
    }

    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = this.sanitizeObject(value, options);
      }
      return sanitized;
    }

    return obj;
  }

  /**
   * Видалити невидимі символи
   */
  static removeInvisibleChars(value: string): string {
    return String(value)
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/[\u200E\u200F]/g, '')
      .replace(/[\u202A-\u202E]/g, '');
  }

  /**
   * Нормалізувати Юникод
   */
  static normalizeUnicode(value: string): string {
    return String(value).normalize('NFKC');
  }

  /**
   * Видалити контрольні символи
   */
  static removeControlChars(value: string): string {
    return String(value).replace(/[\x00-\x1F\x7F]/g, '');
  }

  /**
   * Безпечна подвійна кодування для видалення
   */
  static doubleEncode(value: string): string {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  /**
   * Повна санітизація для вводу з Телеграму
   */
  static sanitizeTelegramInput(value: any): string {
    if (typeof value !== 'string') {
      return '';
    }

    return this.sanitizeString(value, {
      removeHtml: true,
      trim: true,
      replaceSpaces: true,
      maxLength: 4096
    });
  }

  /**
   * Санітизувати параметри пошуку
   */
  static sanitizeSearchQuery(value: string, maxLength: number = 100): string {
    return this.sanitizeString(value, {
      removeHtml: true,
      trim: true,
      replaceSpaces: true,
      maxLength
    })
      .replace(/[^\w\s-а-яіїєґА-ЯІЇЄҐ]/g, '');
  }

  /**
   * Санітизувати шлях файлу
   */
  static sanitizeFilePath(value: string): string {
    return String(value)
      .replace(/\.\./g, '')
      .replace(/\\/g, '/')
      .replace(/\/+/g, '/')
      .replace(/^\//, '');
  }

  /**
   * Санітизувати ім'я файлу
   */
  static sanitizeFileName(value: string): string {
    return String(value)
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/\.+/g, '.')
      .replace(/_+/g, '_')
      .substring(0, 255);
  }
}
