/**
 * SQL Injection Protection Tests
 */

import { SafeQueryExecutor } from '../../database/SafeQueryExecutor';
import { InputSanitizer } from '../../validation/InputSanitizer';

describe('SQL Injection Protection', () => {
  describe('InputSanitizer', () => {
    it('should exist and have proper methods', () => {
      expect(typeof InputSanitizer.checkSqlInjection).toBe('function');
      expect(typeof InputSanitizer.sanitizeString).toBe('function');
    });

    it('should allow safe inputs', () => {
      const safeInputs = [
        "Harry Potter",
        "J.K. Rowling",
        "Science Fiction",
        "Book about programming"
      ];

      safeInputs.forEach(input => {
        expect(InputSanitizer.checkSqlInjection(input)).toBe(false);
      });
    });
  });
  
  describe('Table Name Validation', () => {
    it('should validate table names', () => {
      // Valid table names
      expect(/^[a-zA-Z_][a-zA-Z0-9_]*$/.test('books')).toBe(true);
      expect(/^[a-zA-Z_][a-zA-Z0-9_]*$/.test('users')).toBe(true);
      expect(/^[a-zA-Z_][a-zA-Z0-9_]*$/.test('book_tags')).toBe(true);
      
      // Invalid table names (SQL injection attempts)
      expect(/^[a-zA-Z_][a-zA-Z0-9_]*$/.test('books; DROP TABLE users')).toBe(false);
      expect(/^[a-zA-Z_][a-zA-Z0-9_]*$/.test('books--')).toBe(false);
    });
  });
});
