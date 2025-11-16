/**
 * Input Validation System
 * REFACTOR-014: Comprehensive Input Validation
 */

export interface ValidationRule {
  field: string;
  rules: string[];
  message?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export class Validator {
  private static readonly patterns = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    username: /^[a-zA-Z0-9_-]{3,20}$/,
    slug: /^[a-z0-9-]+$/,
    uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    phone: /^\+?[\d\s-()]{10,}$/,
    url: /^https?:\/\/.+/,
    alphanumeric: /^[a-zA-Z0-9]+$/,
    numerics: /^\d+$/,
    ukrainian: /^[А-Яа-яІіЇїЄєҐґ\s.,'"-]+$/,
  };

  /**
   * Валідувати значення
   */
  static validate(value: unknown, rules: string[]): ValidationError | null {
    for (const rule of rules) {
      const error = this.validateRule(value, rule);
      if (error) return error;
    }
    return null;
  }

  /**
   * Валідувати одне правило
   */
  private static validateRule(value: unknown, rule: string): ValidationError | null {
    const [name, ...params] = rule.split(':');

    switch (name) {
      case 'required':
        if (value === null || value === undefined || value === '') {
          return { field: '', message: 'This field is required' };
        }
        break;

      case 'string':
        if (typeof value !== 'string') {
          return { field: '', message: 'Value must be a string', value };
        }
        break;

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return { field: '', message: 'Value must be a number', value };
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          return { field: '', message: 'Value must be a boolean', value };
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          return { field: '', message: 'Value must be an array', value };
        }
        break;

      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          return { field: '', message: 'Value must be an object', value };
        }
        break;

      case 'email':
        if (typeof value !== 'string' || !this.patterns.email.test(value)) {
          return { field: '', message: 'Invalid email format', value };
        }
        break;

      case 'username':
        if (typeof value !== 'string' || !this.patterns.username.test(value)) {
          return {
            field: '',
            message: 'Username must be 3-20 characters (alphanumeric, - or _)',
            value,
          };
        }
        break;

      case 'url':
        if (typeof value !== 'string' || !this.patterns.url.test(value)) {
          return { field: '', message: 'Invalid URL format', value };
        }
        break;

      case 'uuid':
        if (typeof value !== 'string' || !this.patterns.uuid.test(value)) {
          return { field: '', message: 'Invalid UUID format', value };
        }
        break;

      case 'phone':
        if (typeof value !== 'string' || !this.patterns.phone.test(value)) {
          return { field: '', message: 'Invalid phone number format', value };
        }
        break;

      case 'min':
        {
          const min = parseInt(params[0], 10);
          if (typeof value === 'string' && value.length < min) {
            return { field: '', message: `Minimum length is ${min}`, value };
          }
          if (typeof value === 'number' && value < min) {
            return { field: '', message: `Minimum value is ${min}`, value };
          }
          if (Array.isArray(value) && value.length < min) {
            return { field: '', message: `Minimum items is ${min}`, value };
          }
        }
        break;

      case 'max':
        {
          const max = parseInt(params[0], 10);
          if (typeof value === 'string' && value.length > max) {
            return { field: '', message: `Maximum length is ${max}`, value };
          }
          if (typeof value === 'number' && value > max) {
            return { field: '', message: `Maximum value is ${max}`, value };
          }
          if (Array.isArray(value) && value.length > max) {
            return { field: '', message: `Maximum items is ${max}`, value };
          }
        }
        break;

      case 'between':
        {
          const [min, max] = params.map((p) => parseInt(p, 10));
          const len =
            typeof value === 'string' ? value.length : typeof value === 'number' ? value : 0;
          if (len < min || len > max) {
            return { field: '', message: `Value must be between ${min} and ${max}`, value };
          }
        }
        break;

      case 'pattern':
        {
          if (typeof value !== 'string') {
            return { field: '', message: 'Value must be a string for pattern validation', value };
          }
          const pattern = new RegExp(params[0]);
          if (!pattern.test(value)) {
            return { field: '', message: `Value does not match pattern ${params[0]}`, value };
          }
        }
        break;

      case 'in':
        {
          const allowedValues = params;
          if (!allowedValues.includes(String(value))) {
            return {
              field: '',
              message: `Value must be one of: ${allowedValues.join(', ')}`,
              value,
            };
          }
        }
        break;

      case 'numeric':
        if (!this.patterns.numerics.test(String(value))) {
          return { field: '', message: 'Value must contain only numbers', value };
        }
        break;

      case 'alphanumeric':
        if (!this.patterns.alphanumeric.test(String(value))) {
          return { field: '', message: 'Value must be alphanumeric', value };
        }
        break;

      case 'slug':
        if (typeof value !== 'string' || !this.patterns.slug.test(value)) {
          return {
            field: '',
            message: 'Value must be a valid slug (lowercase, numbers, hyphens)',
            value,
          };
        }
        break;

      case 'latin':
        if (typeof value !== 'string' || !/^[a-zA-Z0-9\s.,'"-]+$/.test(value)) {
          return { field: '', message: 'Value must contain only Latin characters', value };
        }
        break;

      case 'ukrainian':
        if (typeof value !== 'string' || !this.patterns.ukrainian.test(value)) {
          return { field: '', message: 'Value must contain only Ukrainian characters', value };
        }
        break;

      case 'safe':
        if (typeof value !== 'string' || this.hasSuspiciousPatterns(value)) {
          return { field: '', message: 'Value contains suspicious patterns', value };
        }
        break;
    }

    return null;
  }

  /**
   * Перевірити на підозрілі паттерни
   */
  private static hasSuspiciousPatterns(value: string): boolean {
    const suspiciousPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<!--.*?-->/g,
      /%27|%3C|%3E/gi,
    ];

    return suspiciousPatterns.some((pattern) => pattern.test(value));
  }

  /**
   * Санітизувати значення
   */
  static sanitize(value: unknown, type: string = 'string'): unknown {
    if (value === null || value === undefined) {
      return null;
    }

    switch (type) {
      case 'string':
        return String(value)
          .trim()
          .replace(/<script[^>]*>.*?<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '');

      case 'number':
        const num =
          typeof value === 'string' || typeof value === 'number' ? parseFloat(String(value)) : NaN;
        return isNaN(num) ? 0 : num;

      case 'boolean':
        return value === true || value === 'true' || value === 1 || value === '1';

      case 'email':
        return String(value).trim().toLowerCase();

      case 'array':
        if (Array.isArray(value)) {
          return value.map((item) => this.sanitize(item, 'string'));
        }
        return [];

      case 'object':
        if (typeof value === 'object' && value !== null) {
          const sanitized: Record<string, unknown> = {};
          for (const [key, val] of Object.entries(value)) {
            sanitized[key] = this.sanitize(val, 'string');
          }
          return sanitized;
        }
        return {};

      default:
        return value;
    }
  }

  /**
   * Валідувати об'єкт по схемі
   */
  static validateObject(
    data: Record<string, unknown>,
    schema: Record<string, string[]>
  ): ValidationResult {
    const errors: ValidationError[] = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];
      const error = this.validate(value, rules);

      if (error) {
        errors.push({
          field,
          message: error.message,
          value,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Валідувати і санітизувати об'єкт
   */
  static validateAndSanitize(
    data: Record<string, unknown>,
    schema: Record<string, { rules: string[]; type?: string }>
  ): {
    valid: boolean;
    data: Record<string, unknown>;
    errors: ValidationError[];
  } {
    const errors: ValidationError[] = [];
    const sanitized: Record<string, unknown> = {};

    for (const [field, config] of Object.entries(schema)) {
      const value = data[field];
      const error = this.validate(value, config.rules);

      if (error) {
        errors.push({
          field,
          message: error.message,
          value,
        });
      } else {
        sanitized[field] = this.sanitize(value, config.type || 'string');
      }
    }

    return {
      valid: errors.length === 0,
      data: sanitized,
      errors,
    };
  }
}

/**
 * Fluent Validation Builder
 */
export class ValidationBuilder {
  private rules: Record<string, string[]> = {};

  field(name: string): this {
    if (!this.rules[name]) {
      this.rules[name] = [];
    }
    this._currentField = name;
    return this;
  }

  private _currentField: string = '';

  required(): this {
    this.addRule('required');
    return this;
  }

  string(): this {
    this.addRule('string');
    return this;
  }

  number(): this {
    this.addRule('number');
    return this;
  }

  email(): this {
    this.addRule('email');
    return this;
  }

  min(length: number): this {
    this.addRule(`min:${length}`);
    return this;
  }

  max(length: number): this {
    this.addRule(`max:${length}`);
    return this;
  }

  between(min: number, max: number): this {
    this.addRule(`between:${min}:${max}`);
    return this;
  }

  in(...values: unknown[]): this {
    this.addRule(`in:${values.join(':')}`);
    return this;
  }

  pattern(regex: string | RegExp): this {
    const pattern = typeof regex === 'string' ? regex : regex.source;
    this.addRule(`pattern:${pattern}`);
    return this;
  }

  safe(): this {
    this.addRule('safe');
    return this;
  }

  private addRule(rule: string): void {
    if (!this.rules[this._currentField]) {
      this.rules[this._currentField] = [];
    }
    this.rules[this._currentField].push(rule);
  }

  build(): Record<string, string[]> {
    return this.rules;
  }

  validate(data: Record<string, unknown>): ValidationResult {
    return Validator.validateObject(data, this.rules);
  }
}
