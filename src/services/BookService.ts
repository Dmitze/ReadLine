/**
 * Book Service - Бізнес-логіка для роботи з книгами
 * REFACTOR-003: Service Layer
 */

import { BookRepository } from '../repositories/BookRepository';
import { ReviewRepository } from '../repositories/ReviewRepository';
import { SavedBookRepository } from '../repositories/SavedBookRepository';
import { TagRepository } from '../repositories/TagRepository';
import { Result, Ok, Err } from '../core/Result';
import { getBookDetailedStats, updateBookInfo } from '../database/models';

export interface CreateBookInput {
  title: string;
  author: string;
  genre: string;
  description: string;
  photo_file_id?: string;
  file_type: 'physical' | 'file' | 'audio' | 'link';
  file_path?: string;
  file_size?: number;
}

export interface UpdateBookInput {
  title?: string;
  author?: string;
  genre?: string;
  description?: string;
  photo_file_id?: string;
}

export interface BookFilters {
  genre?: string;
  searchQuery?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'rating' | 'date' | 'title';
  userId?: number;
}

export class BookService {
  constructor(
    private bookRepository: BookRepository,
    private reviewRepository: ReviewRepository,
    private savedBookRepository: SavedBookRepository,
    private tagRepository: TagRepository
  ) {}

  /**
   * Створити нову книгу
   * @param input - Дані для створення книги
   * @returns Result з ID нової книги
   */
  async createBook(input: CreateBookInput): Promise<Result<number>> {
    try {
      if (!input.title || !input.author || !input.genre) {
        return new Err(new Error('Missing required book fields: title, author, genre'));
      }

      const bookId = await this.bookRepository.insert({
        title: input.title,
        author: input.author,
        genre: input.genre,
        description: input.description,
        photo_file_id: input.photo_file_id || 'default_cover',
        file_type: input.file_type,
        file_url: input.file_path,
        online_link: undefined,
        audio_file_id: undefined,
        file_name: undefined
      });

      return new Ok(bookId);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to create book'));
    }
  }

  /**
   * Отримати книгу за ID
   * @param bookId - ID книги
   * @returns Result з даними книги включаючи відгуки та рейтинг
   */
  async getBookById(bookId: number): Promise<Result<any>> {
    try {
      const book = await this.bookRepository.findById(bookId);
      
      if (!book) {
        return new Err(new Error(`Book with id ${bookId} not found`));
      }

      const reviews = await this.reviewRepository.findByBookId(bookId);
      const rating = reviews.length > 0
        ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
        : '0';

      return new Ok({
        ...book,
        reviews_count: reviews.length,
        rating
      });
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to fetch book'));
    }
  }

  /**
   * Оновити книгу
   */
  async updateBook(bookId: number, input: UpdateBookInput): Promise<Result<void>> {
    try {
      const book = await this.bookRepository.findById(bookId);
      if (!book) {
        return new Err(new Error(`Book with id ${bookId} not found`));
      }

      await this.bookRepository.update(bookId, {
        title: input.title || book.title,
        author: input.author || book.author,
        genre: input.genre || book.genre,
        description: input.description || book.description,
        photo_file_id: input.photo_file_id || book.photo_file_id
      });

      return new Ok(undefined);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to update book'));
    }
  }

  /**
   * Видалити книгу
   */
  async deleteBook(bookId: number): Promise<Result<void>> {
    try {
      const book = await this.bookRepository.findById(bookId);
      if (!book) {
        return new Err(new Error(`Book with id ${bookId} not found`));
      }

      // Видалити всі пов'язані дані
      await this.reviewRepository.deleteByBookId(bookId);
      await this.savedBookRepository.deleteByBookId(bookId);
      await this.tagRepository.deleteByBookId(bookId);
      await this.bookRepository.delete(bookId);

      return new Ok(undefined);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to delete book'));
    }
  }

  /**
   * Пошук книг
   */
  async searchBooks(filters: BookFilters): Promise<Result<any[]>> {
    try {
      let query = 'SELECT * FROM books WHERE 1=1';
      const params: any[] = [];

      if (filters.genre) {
        query += ' AND genre LIKE ?';
        params.push(`%${filters.genre}%`);
      }

      if (filters.searchQuery) {
        query += ' AND (title LIKE ? OR author LIKE ? OR description LIKE ?)';
        const searchTerm = `%${filters.searchQuery}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      if (filters.sortBy === 'rating') {
        query += ' ORDER BY (SELECT AVG(rating) FROM reviews WHERE book_id = books.id) DESC';
      } else if (filters.sortBy === 'date') {
        query += ' ORDER BY created_at DESC';
      } else {
        query += ' ORDER BY title ASC';
      }

      const limit = filters.limit || 20;
      const offset = filters.offset || 0;
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);

      // Using direct database call for complex filtered query
      const books = await (this.bookRepository as any).db.all(query, params);
      return new Ok(books);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to search books'));
    }
  }

  /**
   * Отримати популярні книги
   */
  async getPopularBooks(limit: number = 10): Promise<Result<any[]>> {
    try {
      const books = await this.bookRepository.findMostRated(limit);
      return new Ok(books);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to fetch popular books'));
    }
  }

  /**
   * Отримати нові книги
   */
  async getNewBooks(limit: number = 10): Promise<Result<any[]>> {
    try {
      const books = await this.bookRepository.findNewest(limit);
      return new Ok(books);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to fetch new books'));
    }
  }

  /**
   * Отримати книги за жанром
   */
  async getBooksByGenre(genre: string, limit: number = 20, offset: number = 0): Promise<Result<any[]>> {
    try {
      const books = await this.bookRepository.findByGenre(genre);
      // Apply pagination manually
      const paginatedBooks = books.slice(offset, offset + limit);
      return new Ok(paginatedBooks);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to fetch books by genre'));
    }
  }

  /**
   * Отримати схожі книги
   */
  async getSimilarBooks(bookId: number, limit: number = 5): Promise<Result<any[]>> {
    try {
      const book = await this.bookRepository.findById(bookId);
      if (!book) {
        return new Err(new Error(`Book with id ${bookId} not found`));
      }

      const similarBooks = await this.bookRepository.findByGenre(book.genre);
      const filtered = similarBooks.filter(b => b.id !== bookId).slice(0, limit);

      return new Ok(filtered);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to fetch similar books'));
    }
  }

  /**
   * Додати тег до книги
   */
  async addTagToBook(bookId: number, tagId: number): Promise<Result<void>> {
    try {
      const book = await this.bookRepository.findById(bookId);
      if (!book) {
        return new Err(new Error(`Book with id ${bookId} not found`));
      }

      const tag = await this.tagRepository.findById(tagId);
      if (!tag) {
        return new Err(new Error(`Tag with id ${tagId} not found`));
      }

      await this.tagRepository.addTagToBook(bookId, tagId);
      return new Ok(undefined);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to add tag to book'));
    }
  }

  /**
   * Отримати теги книги
   */
  async getBookTags(bookId: number): Promise<Result<any[]>> {
    try {
      const tags = await this.tagRepository.findByBookId(bookId);
      return new Ok(tags);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to fetch book tags'));
    }
  }

  /**
   * Отримати детальну інформацію про книгу (розширена інформація)
   * Включає розподіл рейтингів, кількість читачів, популярні цитати, вікову групу та тригери вмісту
   */
  async getDetailedBookInfo(bookId: number): Promise<Result<any>> {
    try {
      const stats = await getBookDetailedStats(bookId);
      return new Ok(stats);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to fetch detailed book info'));
    }
  }

  /**
   * Оновити розширену інформацію про книгу
   * @param bookId - ID книги
   * @param recommendedAge - Рекомендована вікова група (0 - всім, 6, 12, 16, 18)
   * @param contentWarnings - Масив тригерів вмісту (наприклад: ["violence", "explicit_content"])
   */
  async updateBookExtendedInfo(
    bookId: number,
    recommendedAge?: number,
    contentWarnings?: string[]
  ): Promise<Result<void>> {
    try {
      const book = await this.bookRepository.findById(bookId);
      if (!book) {
        return new Err(new Error(`Book with id ${bookId} not found`));
      }

      let result = 0;
      if (recommendedAge !== undefined) {
        result += await updateBookInfo(bookId, 'recommended_age', recommendedAge);
      }
      if (contentWarnings !== undefined) {
        result += await updateBookInfo(bookId, 'content_warnings', JSON.stringify(contentWarnings));
      }
      if (result === 0) {
        return new Err(new Error('No updates were made'));
      }

      return new Ok(undefined);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to update book extended info'));
    }
  }
}
