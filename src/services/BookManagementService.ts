import { Book, addBook } from '../database/models';
import { addBookTag } from '../database/tagFunctions';
import { TagRepository } from '../repositories/TagRepository';
import { logger } from '../utils/logger';
import { validateBookData } from '../utils/validation';
import { Result, ok, err } from '../core/Result';

export interface BookCreationData {
  title: string;
  author: string;
  genre: string;
  description: string;
  photo_file_id?: string;
  file_type: string;
  is_physically_available: boolean;
  file_url?: string;
  file_name?: string;
  audio_file_id?: string;
  online_link?: string;
  selectedTags?: number[];
}

export interface BookCreationResult {
  bookId: number;
  book: Book;
}

export class BookManagementService {
  private tagRepository: TagRepository;
  private db: any;

  constructor(db: any) {
    this.db = db;
    this.tagRepository = new TagRepository(db);
  }

  async createBook(bookData: BookCreationData): Promise<Result<BookCreationResult, Error>> {
    try {
      const validation = validateBookData(bookData);
      if (!validation.isValid) {
        return err(new Error(`Validation failed: ${validation.errors.join(', ')}`));
      }

      const bookDataForDb: any = {
        ...bookData,
        photo_file_id: bookData.photo_file_id || 'default_book_cover',
      };
      const bookId = await addBook(bookDataForDb);

      if (bookData.selectedTags && bookData.selectedTags.length > 0) {
        await this.tagRepository.addBookTags(bookId, bookData.selectedTags);
      }

      const book: Book = {
        ...bookData,
        id: bookId,
        is_available: true,
        created_at: new Date().toISOString(),
      } as Book;

      logger.info('Book created successfully', {
        bookId,
        title: bookData.title,
        author: bookData.author,
        formats: {
          hasFile: !!bookData.file_url,
          hasAudio: !!bookData.audio_file_id,
          hasLink: !!bookData.online_link,
        },
        tagsCount: bookData.selectedTags?.length || 0,
      });

      return ok({ bookId, book });
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to create book', errorObj, {
        title: bookData.title,
        author: bookData.author,
      });
      return err(errorObj);
    }
  }

  async bulkUpdateAvailability(
    bookIds: number[],
    available: boolean,
    adminId?: number
  ): Promise<Result<{ success: boolean; count: number; errors: string[] }, Error>> {
    try {
      const errors: string[] = [];
      let successCount = 0;

      for (const bookId of bookIds) {
        try {
          await this.db.run(
            'UPDATE books SET is_available = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [available ? 1 : 0, bookId]
          );
          successCount++;

          logger.info('Book availability updated', {
            bookId,
            available,
            adminId,
          });
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          errors.push(`Book ${bookId}: ${errMsg}`);
          logger.error(
            'Failed to update book availability',
            error instanceof Error ? error : new Error(String(error)),
            {
              bookId,
              available,
              adminId,
            }
          );
        }
      }

      return ok({
        success: errors.length === 0,
        count: successCount,
        errors,
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to bulk update book availability', errMsg, {
        bookIds,
        available,
        adminId,
      });
      return err(errMsg);
    }
  }

  async bulkDeleteBooks(
    bookIds: number[],
    adminId?: number
  ): Promise<Result<{ success: boolean; count: number; errors: string[] }, Error>> {
    try {
      const errors: string[] = [];
      let successCount = 0;

      for (const bookId of bookIds) {
        try {
          await this.db.run('DELETE FROM books WHERE id = ?', [bookId]);
          successCount++;

          logger.info('Book deleted', {
            bookId,
            adminId,
          });
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          errors.push(`Book ${bookId}: ${errMsg}`);
          logger.error(
            'Failed to delete book',
            error instanceof Error ? error : new Error(String(error)),
            {
              bookId,
              adminId,
            }
          );
        }
      }

      return ok({
        success: errors.length === 0,
        count: successCount,
        errors,
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to bulk delete books', errMsg, {
        bookIds,
        adminId,
      });
      return err(errMsg);
    }
  }

  validateBookData(bookData: Partial<BookCreationData>): Result<boolean, string[]> {
    const errors: string[] = [];

    if (!bookData.title?.trim()) {
      errors.push("Назва книги обов'язкова");
    }

    if (!bookData.author?.trim()) {
      errors.push("Автор обов'язковий");
    }

    if (!bookData.genre?.trim()) {
      errors.push("Жанр обов'язковий");
    }

    if (!bookData.description?.trim()) {
      errors.push("Опис обов'язковий");
    }

    if (bookData.title && bookData.title.length > 500) {
      errors.push('Назва книги занадто довга (макс. 500 символів)');
    }

    if (bookData.author && bookData.author.length > 300) {
      errors.push("Ім'я автора занадто довге (макс. 300 символів)");
    }

    if (bookData.description && bookData.description.length > 5000) {
      errors.push('Опис занадто довгий (макс. 5000 символів)');
    }

    if (errors.length > 0) {
      return err(errors);
    }

    return ok(true);
  }

  async canUserAddBook(userId: number): Promise<Result<boolean, string>> {
    return ok(true);
  }

  async getUserBookStats(userId: number): Promise<
    Result<
      {
        totalBooks: number;
        publishedBooks: number;
        pendingBooks: number;
      },
      Error
    >
  > {
    try {
      return ok({
        totalBooks: 0,
        publishedBooks: 0,
        pendingBooks: 0,
      });
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }
}

export function createBookManagementService(db: any): BookManagementService {
  return new BookManagementService(db);
}
