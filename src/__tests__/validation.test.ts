/**
 * Validation Tests - тести для валідації
 */

import { 
  validateBookData, 
  validateReviewData, 
  validateSearchQuery,
  isValidUrl,
  sanitizeText 
} from '../utils/validation';

describe('Validation Functions', () => {
  describe('validateBookData', () => {
    it('should validate correct book data', () => {
      const validData = {
        title: 'Valid Book Title',
        author: 'Valid Author',
        genre: 'Fiction',
        description: 'A valid description with enough characters',
        photo_file_id: 'valid_photo_id'
      };

      const result = validateBookData(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject empty title', () => {
      const invalidData = {
        title: '',
        author: 'Author',
        genre: 'Genre',
        description: 'Description',
        photo_file_id: 'photo_id'
      };

      const result = validateBookData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject too long title', () => {
      const invalidData = {
        title: 'a'.repeat(201),
        author: 'Author',
        genre: 'Genre',
        description: 'Description',
        photo_file_id: 'photo_id'
      };

      const result = validateBookData(invalidData);
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateReviewData', () => {
    it('should validate correct review data', () => {
      const validData = {
        book_id: 1,
        user_id: 123,
        rating: 5,
        comment: 'Great book!'
      };

      const result = validateReviewData(validData);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid rating', () => {
      const invalidData = {
        book_id: 1,
        user_id: 123,
        rating: 6,
        comment: 'Comment'
      };

      const result = validateReviewData(invalidData);
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateSearchQuery', () => {
    it('should validate correct search query', () => {
      const result = validateSearchQuery('test query');
      expect(result.isValid).toBe(true);
    });

    it('should reject too short query', () => {
      const result = validateSearchQuery('a');
      expect(result.isValid).toBe(false);
    });

    it('should reject empty query', () => {
      const result = validateSearchQuery('');
      expect(result.isValid).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    it('should validate correct URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://example.com')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidUrl('not a url')).toBe(false);
      expect(isValidUrl('ftp://example.com')).toBe(false);
    });
  });

  describe('sanitizeText', () => {
    it('should remove HTML tags', () => {
      const result = sanitizeText('<script>alert("xss")</script>Hello');
      expect(result).toBe('Hello');
    });

    it('should trim whitespace', () => {
      const result = sanitizeText('  Hello  ');
      expect(result).toBe('Hello');
    });
  });
});
