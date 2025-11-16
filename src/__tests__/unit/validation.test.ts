/**
 * Validation Unit Tests
 * Tests for input validation and sanitization
 */

describe('Input Validation', () => {
  // Test email validation pattern
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  it('should validate correct email format', () => {
    expect(emailPattern.test('user@example.com')).toBe(true);
    expect(emailPattern.test('john.doe@company.co.uk')).toBe(true);
  });

  it('should reject invalid email format', () => {
    expect(emailPattern.test('invalid.email')).toBe(false);
    expect(emailPattern.test('@example.com')).toBe(false);
    expect(emailPattern.test('user@')).toBe(false);
  });

  // Test string trimming
  it('should trim whitespace', () => {
    const trim = (str: string) => str.trim();

    expect(trim('  hello  ')).toBe('hello');
    expect(trim('\nhello\n')).toBe('hello');
    expect(trim('\thello\t')).toBe('hello');
  });

  // Test string length validation
  it('should validate string length', () => {
    const isValidLength = (str: string, min: number, max: number) =>
      str.length >= min && str.length <= max;

    expect(isValidLength('test', 2, 10)).toBe(true);
    expect(isValidLength('x', 2, 10)).toBe(false);
    expect(isValidLength('a very long string', 2, 10)).toBe(false);
  });

  // Test required field validation
  it('should validate required fields', () => {
    const isRequired = (value: any) => value != null && value !== '';

    expect(isRequired('text')).toBe(true);
    expect(isRequired(0)).toBe(true);
    expect(isRequired('')).toBe(false);
    expect(isRequired(null)).toBe(false);
    expect(isRequired(undefined)).toBe(false);
  });

  // Test number range validation
  it('should validate number ranges', () => {
    const isInRange = (num: number, min: number, max: number) => num >= min && num <= max;

    expect(isInRange(5, 0, 10)).toBe(true);
    expect(isInRange(0, 0, 10)).toBe(true);
    expect(isInRange(10, 0, 10)).toBe(true);
    expect(isInRange(-1, 0, 10)).toBe(false);
    expect(isInRange(11, 0, 10)).toBe(false);
  });
});

describe('Input Sanitization', () => {
  // HTML sanitization
  it('should remove HTML tags', () => {
    const sanitizeHTML = (str: string) => str.replace(/<[^>]*>/g, '');

    expect(sanitizeHTML('<script>alert("xss")</script>')).toBe('alert("xss")');
    expect(sanitizeHTML('<div>Hello</div>')).toBe('Hello');
    expect(sanitizeHTML('Normal text')).toBe('Normal text');
  });

  // SQL injection prevention
  it('should escape SQL special characters', () => {
    const escapeSQL = (str: string) => str.replace(/'/g, "''").replace(/"/g, '""');

    expect(escapeSQL("'; DROP TABLE users; --")).toBe("''; DROP TABLE users; --");
    expect(escapeSQL('Normal text')).toBe('Normal text');
  });

  // URL parameter sanitization
  it('should encode URL parameters', () => {
    const encodeParam = (str: string) => encodeURIComponent(str);

    expect(encodeParam('hello world')).toBe('hello%20world');
    expect(encodeParam('test&param=value')).toContain('%26');
    expect(encodeParam('user@example.com')).toContain('%40');
  });

  // Whitespace normalization
  it('should normalize whitespace', () => {
    const normalizeSpace = (str: string) => str.replace(/\s+/g, ' ').trim();

    expect(normalizeSpace('hello    world')).toBe('hello world');
    expect(normalizeSpace('\n\nhello\n\nworld\n\n')).toBe('hello world');
    expect(normalizeSpace('   spaced   text   ')).toBe('spaced text');
  });
});

describe('Type Validation', () => {
  it('should validate string type', () => {
    const isString = (value: any): value is string => typeof value === 'string';

    expect(isString('text')).toBe(true);
    expect(isString(123)).toBe(false);
    expect(isString(null)).toBe(false);
  });

  it('should validate number type', () => {
    const isNumber = (value: any): value is number => typeof value === 'number' && !isNaN(value);

    expect(isNumber(42)).toBe(true);
    expect(isNumber(3.14)).toBe(true);
    expect(isNumber(NaN)).toBe(false);
    expect(isNumber('123')).toBe(false);
  });

  it('should validate object type', () => {
    const isObject = (value: any) =>
      value !== null && typeof value === 'object' && !Array.isArray(value);

    expect(isObject({})).toBe(true);
    expect(isObject({ key: 'value' })).toBe(true);
    expect(isObject([])).toBe(false);
    expect(isObject('string')).toBe(false);
  });

  it('should validate array type', () => {
    const isArray = (value: any): value is any[] => Array.isArray(value);

    expect(isArray([])).toBe(true);
    expect(isArray([1, 2, 3])).toBe(true);
    expect(isArray({})).toBe(false);
    expect(isArray('array')).toBe(false);
  });
});
