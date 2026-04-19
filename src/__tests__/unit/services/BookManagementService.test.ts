import { BookManagementService, BookCreationData } from '../../../services/BookManagementService';
import { Result } from '../../../core/Result';

const mockDb = {
  run: jest.fn(),
  get: jest.fn(),
  all: jest.fn(),
};

const mockTagRepository = {
  addBookTags: jest.fn(),
};

let TagRepository: any;
beforeAll(async () => {
  const module = await import('../../../repositories/TagRepository');
  TagRepository = module.TagRepository;
});

const createMockTagRepository = () => {
  const mockDb = {
    run: jest.fn(),
    get: jest.fn(),
    all: jest.fn(),
  };
  return new TagRepository(mockDb);
};

jest.mock('../../../database/models', () => ({
  addBook: jest.fn(),
}));

jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../../utils/validation', () => ({
  validateBookData: jest.fn(),
}));

describe('BookManagementService', () => {
  let service: BookManagementService;
  let mockAddBook: jest.MockedFunction<any>;
  let mockValidateBookData: jest.MockedFunction<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BookManagementService(mockDb);
    mockAddBook = require('../../../database/models').addBook;
    mockValidateBookData = require('../../../utils/validation').validateBookData;
  });

  describe('createBook', () => {
    const validBookData: BookCreationData = {
      title: 'Test Book',
      author: 'Test Author',
      genre: 'Fiction',
      description: 'Test description',
      file_type: 'file',
      is_physically_available: false,
    };

    it('should create book successfully', async () => {
      const expectedBookId = 123;
      mockValidateBookData.mockReturnValue({ isValid: true });
      mockAddBook.mockResolvedValue(expectedBookId);
      mockTagRepository.addBookTags.mockResolvedValue(undefined);

      const result = await service.createBook(validBookData);

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual({
        bookId: expectedBookId,
        book: expect.objectContaining({
          id: expectedBookId,
          title: validBookData.title,
          author: validBookData.author,
          is_available: true,
        }),
      });
      expect(mockAddBook).toHaveBeenCalledWith({
        ...validBookData,
        photo_file_id: 'default_book_cover',
      });
    });

    it('should create book with tags data', async () => {
      const bookDataWithTags = { ...validBookData, selectedTags: [1, 2, 3] };
      mockValidateBookData.mockReturnValue({ isValid: true });
      mockAddBook.mockResolvedValue(123);

      const result = await service.createBook(bookDataWithTags);

      expect(result.isOk()).toBe(true);
      const bookResult = result.unwrap();
      expect(bookResult.bookId).toBe(123);
      expect(bookResult.book.title).toBe(validBookData.title);
      expect(bookResult.book.author).toBe(validBookData.author);
    });

    it('should return error when validation fails', async () => {
      const validationErrors = ['Title is required'];
      mockValidateBookData.mockReturnValue({
        isValid: false,
        errors: validationErrors,
      });

      const result = await service.createBook(validBookData);

      expect(result.isErr()).toBe(true);
      const error = (result as any).error;
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('Validation failed');
      expect(mockAddBook).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database connection failed');
      mockValidateBookData.mockReturnValue({ isValid: true });
      mockAddBook.mockRejectedValue(dbError);

      const result = await service.createBook(validBookData);

      expect(result.isErr()).toBe(true);
      expect((result as any).error).toBe(dbError);
    });
  });

  describe('validateBookData', () => {
    it('should return success for valid data', () => {
      const validData = {
        title: 'Valid Title',
        author: 'Valid Author',
        genre: 'Fiction',
        description: 'Valid description',
      };

      const result = service.validateBookData(validData);

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(true);
    });

    it('should return errors for invalid data', () => {
      const invalidData = {
        title: '',
        author: '',
        genre: '',
        description: '',
      };

      // Act
      const result = service.validateBookData(invalidData);

      // Assert
      expect(result.isErr()).toBe(true);
      const errors = (result as any).error;
      expect(Array.isArray(errors)).toBe(true);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors).toContain("Назва книги обов'язкова");
      expect(errors).toContain("Автор обов'язковий");
    });

    it('should validate title length', () => {
      const longTitle = 'a'.repeat(501);
      const data = {
        title: longTitle,
        author: 'Author',
        genre: 'Fiction',
        description: 'Description',
      };

      const result = service.validateBookData(data);

      expect(result.isErr()).toBe(true);
      const errors = (result as any).error;
      expect(errors).toContain('Назва книги занадто довга (макс. 500 символів)');
    });

    it('should validate author length', () => {
      const longAuthor = 'a'.repeat(301);
      const data = {
        title: 'Title',
        author: longAuthor,
        genre: 'Fiction',
        description: 'Description',
      };

      const result = service.validateBookData(data);

      expect(result.isErr()).toBe(true);
      const errors = (result as any).error;
      expect(errors).toContain("Ім'я автора занадто довге (макс. 300 символів)");
    });

    it('should validate description length', () => {
      const longDescription = 'a'.repeat(5001);
      const data = {
        title: 'Title',
        author: 'Author',
        genre: 'Fiction',
        description: longDescription,
      };

      const result = service.validateBookData(data);

      expect(result.isErr()).toBe(true);
      const errors = (result as any).error;
      expect(errors).toContain('Опис занадто довгий (макс. 5000 символів)');
    });
  });

  describe('canUserAddBook', () => {
    it('should return true by default', async () => {
      const result = await service.canUserAddBook(123);

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(true);
    });
  });

  describe('getUserBookStats', () => {
    it('should return default stats', async () => {
      const result = await service.getUserBookStats(123);

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual({
        totalBooks: 0,
        publishedBooks: 0,
        pendingBooks: 0,
      });
    });
  });

  describe('bulkUpdateAvailability', () => {
    beforeEach(() => {
      mockDb.run.mockResolvedValue({ lastID: 0, changes: 1 });
    });

    it('should update book availability successfully', async () => {
      const bookIds = [1, 2, 3];
      const adminId = 123;

      const result = await service.bulkUpdateAvailability(bookIds, true, adminId);

      expect(result.isOk()).toBe(true);
      const data = result.unwrap();
      expect(data.success).toBe(true);
      expect(data.count).toBe(3);
      expect(data.errors).toHaveLength(0);

      expect(mockDb.run).toHaveBeenCalledTimes(3);
      expect(mockDb.run).toHaveBeenCalledWith(
        'UPDATE books SET is_available = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [1, 1]
      );
      expect(mockDb.run).toHaveBeenCalledWith(
        'UPDATE books SET is_available = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [1, 2]
      );
      expect(mockDb.run).toHaveBeenCalledWith(
        'UPDATE books SET is_available = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [1, 3]
      );
    });

    it('should handle partial failures', async () => {
      const bookIds = [1, 2, 3];
      mockDb.run
        .mockResolvedValueOnce({ lastID: 0, changes: 1 })
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce({ lastID: 0, changes: 1 });

      const result = await service.bulkUpdateAvailability(bookIds, false);

      expect(result.isOk()).toBe(true);
      const data = result.unwrap();
      expect(data.success).toBe(false);
      expect(data.count).toBe(2);
      expect(data.errors).toHaveLength(1);
      expect(data.errors[0]).toContain('Book 2: Database error');
    });

    it('should return partial success on complete failure', async () => {
      const bookIds = [1, 2];
      const dbError = new Error('Connection failed');
      mockDb.run.mockRejectedValue(dbError);

      const result = await service.bulkUpdateAvailability(bookIds, true);

      expect(result.isOk()).toBe(true);
      const data = result.unwrap();
      expect(data.success).toBe(false);
      expect(data.count).toBe(0);
      expect(data.errors).toHaveLength(2);
      expect(data.errors[0]).toContain('Book 1: Connection failed');
      expect(data.errors[1]).toContain('Book 2: Connection failed');
    });
  });

  describe('bulkDeleteBooks', () => {
    beforeEach(() => {
      mockDb.run.mockResolvedValue({ lastID: 0, changes: 1 });
    });

    it('should delete books successfully', async () => {
      const bookIds = [1, 2, 3];
      const adminId = 123;

      const result = await service.bulkDeleteBooks(bookIds, adminId);

      expect(result.isOk()).toBe(true);
      const data = result.unwrap();
      expect(data.success).toBe(true);
      expect(data.count).toBe(3);
      expect(data.errors).toHaveLength(0);

      expect(mockDb.run).toHaveBeenCalledTimes(3);
      expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM books WHERE id = ?', [1]);
      expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM books WHERE id = ?', [2]);
      expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM books WHERE id = ?', [3]);
    });

    it('should handle partial deletion failures', async () => {
      const bookIds = [1, 2, 3];
      mockDb.run
        .mockResolvedValueOnce({ lastID: 0, changes: 1 })
        .mockRejectedValueOnce(new Error('Foreign key constraint'))
        .mockResolvedValueOnce({ lastID: 0, changes: 1 });

      const result = await service.bulkDeleteBooks(bookIds);

      expect(result.isOk()).toBe(true);
      const data = result.unwrap();
      expect(data.success).toBe(false);
      expect(data.count).toBe(2);
      expect(data.errors).toHaveLength(1);
      expect(data.errors[0]).toContain('Book 2: Foreign key constraint');
    });

    it('should return partial success on database connection failure', async () => {
      const bookIds = [1];
      const dbError = new Error('Database connection lost');
      mockDb.run.mockRejectedValue(dbError);

      const result = await service.bulkDeleteBooks(bookIds);

      expect(result.isOk()).toBe(true);
      const data = result.unwrap();
      expect(data.success).toBe(false);
      expect(data.count).toBe(0);
      expect(data.errors).toHaveLength(1);
      expect(data.errors[0]).toContain('Book 1: Database connection lost');
    });
  });
});
