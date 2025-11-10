/**
 * Тести для валідації даних
 */

import {
  validateBookData,
  validateReviewData,
  validateSearchQuery,
  isValidUrl,
  isValidPhoneNumber,
  sanitizeText,
} from '../utils/validation';

describe('Validation Utils', () => {
  describe('validateBookData', () => {
    test('має пройти валідацію з валідними даними', () => {
      const result = validateBookData({
        title: 'Тестова книга',
        author: 'Тестовий автор',
        genre: 'Фантастика',
        description: 'Тестовий опис книги',
        photo_file_id: 'test_file_id',
        file_type: 'physical',
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('має провалити валідацію без назви', () => {
      const result = validateBookData({
        title: '',
        author: 'Автор',
        genre: 'Жанр',
        description: 'Опис',
        photo_file_id: 'file_id',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Назва книги обов\'язкова');
    });

    test('має провалити валідацію з занадто довгою назвою', () => {
      const result = validateBookData({
        title: 'a'.repeat(201),
        author: 'Автор',
        genre: 'Жанр',
        description: 'Опис',
        photo_file_id: 'file_id',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Назва книги занадто довга (максимум 200 символів)');
    });

    test('має провалити валідацію з невірним типом файлу', () => {
      const result = validateBookData({
        title: 'Книга',
        author: 'Автор',
        genre: 'Жанр',
        description: 'Опис',
        photo_file_id: 'file_id',
        file_type: 'invalid_type',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Невірний тип файлу');
    });
  });

  // validateRequestData видалено - більше не використовуємо фізичні книги та заявки

  describe('validateReviewData', () => {
    test('має пройти валідацію з валідними даними', () => {
      const result = validateReviewData({
        book_id: 123,
        user_id: 456,
        rating: 5,
        comment: 'Чудова книга!',
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('має провалити валідацію з невірним рейтингом', () => {
      const result = validateReviewData({
        book_id: 123,
        user_id: 456,
        rating: 6,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Рейтинг має бути від 1 до 5');
    });
  });

  describe('validateSearchQuery', () => {
    test('має пройти валідацію з валідним запитом', () => {
      const result = validateSearchQuery('тест');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('має провалити валідацію з занадто коротким запитом', () => {
      const result = validateSearchQuery('a');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Пошуковий запит занадто короткий (мінімум 2 символи)');
    });
  });

  describe('isValidUrl', () => {
    test('має повернути true для валідного HTTP URL', () => {
      expect(isValidUrl('http://example.com')).toBe(true);
    });

    test('має повернути true для валідного HTTPS URL', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
    });

    test('має повернути false для невалідного URL', () => {
      expect(isValidUrl('not a url')).toBe(false);
    });

    test('має повернути false для FTP URL', () => {
      expect(isValidUrl('ftp://example.com')).toBe(false);
    });
  });

  describe('isValidPhoneNumber', () => {
    test('має повернути true для валідних українських номерів', () => {
      expect(isValidPhoneNumber('+380501234567')).toBe(true);
      expect(isValidPhoneNumber('0501234567')).toBe(true);
      expect(isValidPhoneNumber('050-123-45-67')).toBe(true);
    });

    test('має повернути false для невалідних номерів', () => {
      expect(isValidPhoneNumber('123')).toBe(false);
      expect(isValidPhoneNumber('invalid')).toBe(false);
    });
  });

  describe('sanitizeText', () => {
    test('має видаляти HTML теги', () => {
      expect(sanitizeText('<script>alert("xss")</script>')).toBe('alert("xss")');
    });

    test('має обрізати пробіли', () => {
      expect(sanitizeText('  текст  ')).toBe('текст');
    });

    test('має видаляти < та >', () => {
      expect(sanitizeText('a < b > c')).toBe('a  c');
    });
  });
});
