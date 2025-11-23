/**
 * Validation schemas for DTO validation
 * Provides reusable validation rules for all entities
 * @module dtos/ValidationSchemas
 */

/**
 * Validation error result
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Validator interface
 */
export interface Validator<T> {
  validate(data: unknown): ValidationResult;
  validateAsync(data: unknown): Promise<ValidationResult>;
}

/**
 * Common validation rules
 */
export const ValidationRules = {
  /**
   * Validate string field
   */
  string: (value: unknown, options?: { minLength?: number; maxLength?: number }): boolean => {
    if (typeof value !== 'string') return false;
    if (options?.minLength && value.length < options.minLength) return false;
    if (options?.maxLength && value.length > options.maxLength) return false;
    return true;
  },

  /**
   * Validate number field
   */
  number: (
    value: unknown,
    options?: { min?: number; max?: number; integer?: boolean }
  ): boolean => {
    if (typeof value !== 'number') return false;
    if (options?.integer && !Number.isInteger(value)) return false;
    if (options?.min !== undefined && value < options.min) return false;
    if (options?.max !== undefined && value > options.max) return false;
    return true;
  },

  /**
   * Validate boolean field
   */
  boolean: (value: unknown): boolean => {
    return typeof value === 'boolean';
  },

  /**
   * Validate email
   */
  email: (value: unknown): boolean => {
    if (typeof value !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  },

  /**
   * Validate URL
   */
  url: (value: unknown): boolean => {
    if (typeof value !== 'string') return false;
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate rating (1-5)
   */
  rating: (value: unknown): boolean => {
    return ValidationRules.number(value, { min: 1, max: 5, integer: true });
  },

  /**
   * Validate genre
   */
  genre: (value: unknown): boolean => {
    const validGenres = [
      'fiction',
      'nonfiction',
      'mystery',
      'science-fiction',
      'fantasy',
      'romance',
      'thriller',
      'biography',
      'history',
      'self-help',
      'business',
      'technology',
      'other',
    ];
    return typeof value === 'string' && validGenres.includes(value.toLowerCase());
  },

  /**
   * Validate array
   */
  array: (value: unknown, options?: { minLength?: number; maxLength?: number }): boolean => {
    if (!Array.isArray(value)) return false;
    if (options?.minLength && value.length < options.minLength) return false;
    if (options?.maxLength && value.length > options.maxLength) return false;
    return true;
  },

  /**
   * Validate required field
   */
  required: (value: unknown): boolean => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    return true;
  },

  /**
   * Validate optional field (null/undefined allowed)
   */
  optional: (): boolean => {
    return true;
  },
};

/**
 * Book validation schema
 */
export const BookValidationSchema = {
  title: (value: unknown): boolean => {
    return ValidationRules.string(value, { minLength: 1, maxLength: 255 });
  },

  author: (value: unknown): boolean => {
    return ValidationRules.string(value, { minLength: 1, maxLength: 255 });
  },

  description: (value: unknown): boolean => {
    return ValidationRules.optional() || ValidationRules.string(value, { maxLength: 2000 });
  },

  genre: (value: unknown): boolean => {
    return ValidationRules.genre(value);
  },

  cover_url: (value: unknown): boolean => {
    return ValidationRules.optional() || ValidationRules.url(value);
  },

  pdf_url: (value: unknown): boolean => {
    return ValidationRules.optional() || ValidationRules.url(value);
  },

  epub_url: (value: unknown): boolean => {
    return ValidationRules.optional() || ValidationRules.url(value);
  },

  rating: (value: unknown): boolean => {
    return ValidationRules.optional() || ValidationRules.rating(value);
  },

  download_count: (value: unknown): boolean => {
    return ValidationRules.optional() || ValidationRules.number(value, { min: 0, integer: true });
  },

  is_available: (value: unknown): boolean => {
    return ValidationRules.optional() || ValidationRules.boolean(value);
  },
};

/**
 * User validation schema
 */
export const UserValidationSchema = {
  username: (value: unknown): boolean => {
    if (!ValidationRules.optional() && value) {
      return ValidationRules.string(value, { minLength: 1, maxLength: 100 });
    }
    return true;
  },

  first_name: (value: unknown): boolean => {
    if (!ValidationRules.optional() && value) {
      return ValidationRules.string(value, { minLength: 1, maxLength: 100 });
    }
    return true;
  },

  last_name: (value: unknown): boolean => {
    if (!ValidationRules.optional() && value) {
      return ValidationRules.string(value, { minLength: 1, maxLength: 100 });
    }
    return true;
  },

  is_admin: (value: unknown): boolean => {
    return ValidationRules.optional() || ValidationRules.boolean(value);
  },

  favorite_genres: (value: unknown): boolean => {
    return (
      ValidationRules.optional() ||
      (ValidationRules.array(value) && (value as unknown[]).every((g) => ValidationRules.genre(g)))
    );
  },

  language: (value: unknown): boolean => {
    const validLanguages = ['en', 'uk', 'ru'];
    return (
      ValidationRules.optional() || (typeof value === 'string' && validLanguages.includes(value))
    );
  },

  user_id: (value: unknown): boolean => {
    return ValidationRules.number(value, { min: 1, integer: true });
  },
};

/**
 * Review validation schema
 */
export const ReviewValidationSchema = {
  book_id: (value: unknown): boolean => {
    return ValidationRules.number(value, { min: 1, integer: true });
  },

  user_id: (value: unknown): boolean => {
    return ValidationRules.number(value, { min: 1, integer: true });
  },

  rating: (value: unknown): boolean => {
    return ValidationRules.rating(value);
  },

  comment: (value: unknown): boolean => {
    return ValidationRules.optional() || ValidationRules.string(value, { maxLength: 1000 });
  },

  is_published: (value: unknown): boolean => {
    return ValidationRules.optional() || ValidationRules.boolean(value);
  },
};

/**
 * Audio validation schema
 */
export const AudioValidationSchema = {
  book_id: (value: unknown): boolean => {
    return ValidationRules.number(value, { min: 1, integer: true });
  },

  chapter_number: (value: unknown): boolean => {
    return ValidationRules.number(value, { min: 1, integer: true });
  },

  title: (value: unknown): boolean => {
    return ValidationRules.string(value, { minLength: 1, maxLength: 255 });
  },

  audio_url: (value: unknown): boolean => {
    return ValidationRules.url(value);
  },

  duration: (value: unknown): boolean => {
    return ValidationRules.number(value, { min: 1, integer: true });
  },

  file_size: (value: unknown): boolean => {
    return ValidationRules.optional() || ValidationRules.number(value, { min: 0, integer: true });
  },

  current_position: (value: unknown): boolean => {
    return ValidationRules.number(value, { min: 0, integer: true });
  },
};

/**
 * Utility function to validate data against schema
 */
export function validateAgainstSchema<T extends Record<string, unknown>>(
  data: unknown,
  schema: Record<string, (value: unknown) => boolean>
): ValidationResult {
  if (typeof data !== 'object' || data === null) {
    return {
      isValid: false,
      errors: [{ field: 'root', message: 'Data must be an object' }],
    };
  }

  const errors: ValidationError[] = [];
  const obj = data as Record<string, unknown>;

  for (const [field, validator] of Object.entries(schema)) {
    const value = obj[field];
    if (!validator(value)) {
      errors.push({
        field,
        message: `Invalid value for field: ${field}`,
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Utility function to sanitize string input
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .substring(0, 500); // Limit length
}

/**
 * Utility function to validate pagination parameters
 */
export function validatePaginationParams(
  limit?: number,
  offset?: number
): { limit: number; offset: number } {
  const validLimit = Math.min(Math.max(limit || 10, 1), 100);
  const validOffset = Math.max(offset || 0, 0);
  return { limit: validLimit, offset: validOffset };
}

/**
 * Utility function to validate sort parameters
 */
export function validateSortParams(
  sortBy?: string,
  order?: string,
  allowedFields?: string[]
): { sortBy: string; order: 'asc' | 'desc' } {
  const defaultSort = allowedFields?.[0] || 'id';
  const candidate = sortBy ?? '';
  const validSort: string = allowedFields && allowedFields.includes(candidate)
    ? candidate
    : defaultSort;
  const validOrder = (order?.toLowerCase() === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc';
  return { sortBy: validSort, order: validOrder };
}
