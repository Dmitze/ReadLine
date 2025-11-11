/**
 * Database Tests - тести для критичних функцій БД
 */

import { initDatabase, addBook, getBookById, searchBooks } from '../database/models';

describe('Database Functions', () => {
  beforeAll(async () => {
    // Ініціалізуємо БД перед тестами
    await initDatabase();
  });

  describe('initDatabase', () => {
    it('should initialize database without errors', async () => {
      await expect(initDatabase()).resolves.not.toThrow();
    });
  });

  describe('addBook', () => {
    it('should add a book and return ID', async () => {
      const bookData = {
        title: 'Test Book',
        author: 'Test Author',
        genre: 'Test Genre',
        description: 'Test Description',
        photo_file_id: 'test_photo_id'
      };

      const bookId = await addBook(bookData);
      expect(bookId).toBeGreaterThan(0);
    });

    it('should fail with invalid data', async () => {
      const invalidData = {
        title: '',
        author: '',
        genre: '',
        description: '',
        photo_file_id: ''
      };

      // Очікуємо помилку або 0
      await expect(addBook(invalidData as any)).rejects.toThrow();
    });
  });

  describe('getBookById', () => {
    it('should return book by ID', async () => {
      const bookData = {
        title: 'Test Book 2',
        author: 'Test Author 2',
        genre: 'Test Genre',
        description: 'Test Description',
        photo_file_id: 'test_photo_id'
      };

      const bookId = await addBook(bookData);
      const book = await getBookById(bookId);

      expect(book).toBeDefined();
      expect(book?.title).toBe('Test Book 2');
      expect(book?.author).toBe('Test Author 2');
    });

    it('should return undefined for non-existent ID', async () => {
      const book = await getBookById(999999);
      expect(book).toBeUndefined();
    });
  });

  describe('searchBooks', () => {
    it('should find books by title', async () => {
      const books = await searchBooks('Test Book', 10);
      expect(books.length).toBeGreaterThan(0);
    });

    it('should return empty array for non-existent book', async () => {
      const books = await searchBooks('NonExistentBook12345', 10);
      expect(books).toEqual([]);
    });

    it('should limit results', async () => {
      const books = await searchBooks('Test', 2);
      expect(books.length).toBeLessThanOrEqual(2);
    });
  });
});
