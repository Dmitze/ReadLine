/**
 * BookService - Business logic for book operations
 * 
 * Responsibilities:
 * - Book search and discovery
 * - Book recommendations
 * - Genre management
 * - Book metadata operations
 */

import { BaseService } from './BaseService';
import { BookRepository } from '../repositories/BookRepository';
import { ReviewRepository } from '../repositories/ReviewRepository';
import { SavedBookRepository } from '../repositories/SavedBookRepository';
import { ILogger } from '../core/types';
import { Result } from '../core/Result';
import { Book } from '../database/models';

/**
 * Service for book-related operations
 */
export class BookService extends BaseService {
  /**
   * Create a new BookService instance
   * @param bookRepository - Repository for book operations
   * @param reviewRepository - Repository for review operations
   * @param savedBookRepository - Repository for saved books
   * @param logger - Logger instance
   */
  constructor(
    private bookRepository: BookRepository,
    private reviewRepository: ReviewRepository,
    private savedBookRepository: SavedBookRepository,
    logger: ILogger
  ) {
    super(logger);
  }

  /**
   * Search books by query string
   * Searches in title, author, and description
   * @param query - Search query
   * @param limit - Maximum results (default: 20)
   * @returns Result with matching books
   */
  async searchBooks(query: string, limit: number = 20): Promise<Result<Book[]>> {
    return this.executeAsync(
      async () => {
        if (!query || query.trim().length === 0) {
          return [];
        }

        const trimmedQuery = query.trim().toLowerCase();
        return await this.bookRepository.search(trimmedQuery, limit);
      },
      `searchBooks(${query})`
    );
  }

  /**
   * Get books by genre with pagination
   * @param genre - Genre name
   * @param limit - Results per page (default: 10)
   * @param offset - Pagination offset (default: 0)
   * @returns Result with books in genre
   */
  async getBooksByGenre(
    genre: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<Result<{ books: Book[]; total: number }>> {
    return this.executeAsync(
      async () => {
        if (!genre || genre.trim().length === 0) {
          return { books: [], total: 0 };
        }

        return await this.bookRepository.getByGenreWithPagination(genre, limit, offset);
      },
      `getBooksByGenre(${genre})`
    );
  }

  /**
   * Get top-rated books
   * @param limit - Number of books to return (default: 10)
   * @returns Result with top-rated books
   */
  async getTopRatedBooks(limit: number = 10): Promise<Result<Book[]>> {
    return this.executeAsync(
      async () => await this.bookRepository.getTopRated(limit),
      `getTopRatedBooks(${limit})`
    );
  }

  /**
   * Get newest books
   * @param limit - Number of books to return (default: 10)
   * @returns Result with newest books
   */
  async getNewestBooks(limit: number = 10): Promise<Result<Book[]>> {
    return this.executeAsync(
      async () => await this.bookRepository.getNewest(limit),
      `getNewestBooks(${limit})`
    );
  }

  /**
   * Get a random book for recommendation
   * @returns Result with random book
   */
  async getRandomBook(): Promise<Result<Book | null>> {
    return this.executeAsync(
      async () => await this.bookRepository.getRandom(),
      'getRandomBook'
    );
  }

  /**
   * Get book details including rating
   * @param bookId - Book ID
   * @returns Result with book and its average rating
   */
  async getBookDetails(bookId: number): Promise<Result<Book & { averageRating: number } | null>> {
    return this.executeAsync(
      async () => {
        const book = await this.bookRepository.getById(bookId);
        if (!book) return null;

        const averageRating = await this.reviewRepository.getAverageRating(bookId);
        return { ...book, averageRating };
      },
      `getBookDetails(${bookId})`
    );
  }

  /**
   * Get all available genres
   * @returns Result with list of genres
   */
  async getAllGenres(): Promise<Result<string[]>> {
    return this.executeAsync(
      async () => await this.bookRepository.getAllGenres(),
      'getAllGenres'
    );
  }

  /**
   * Increment book download counter
   * @param bookId - Book ID
   * @returns Result with success status
   */
  async incrementDownloadCount(bookId: number): Promise<Result<void>> {
    return this.executeAsync(
      async () => {
        await this.bookRepository.incrementDownloads(bookId);
      },
      `incrementDownloadCount(${bookId})`
    );
  }

  /**
   * Check if book is saved by user
   * @param userId - User ID
   * @param bookId - Book ID
   * @returns Result with boolean
   */
  async isBookSaved(userId: number, bookId: number): Promise<Result<boolean>> {
    return this.executeAsync(
      async () => await this.savedBookRepository.isSaved(userId, bookId),
      `isBookSaved(${userId}, ${bookId})`
    );
  }

  /**
   * Save a book for user
   * @param userId - User ID
   * @param bookId - Book ID
   * @returns Result with save status
   */
  async saveBook(userId: number, bookId: number): Promise<Result<boolean>> {
    return this.executeAsync(
      async () => {
        // Check if already saved
        const isSaved = await this.savedBookRepository.isSaved(userId, bookId);
        if (isSaved) {
          return true; // Already saved
        }

        await this.savedBookRepository.save(userId, bookId);
        return true;
      },
      `saveBook(${userId}, ${bookId})`
    );
  }

  /**
   * Remove book from saved list
   * @param userId - User ID
   * @param bookId - Book ID
   * @returns Result with remove status
   */
  async removeBookFromSaved(userId: number, bookId: number): Promise<Result<number>> {
    return this.executeAsync(
      async () => await this.savedBookRepository.remove(userId, bookId),
      `removeBookFromSaved(${userId}, ${bookId})`
    );
  }

  /**
   * Get user's most saved books
   * @param limit - Number of books (default: 10)
   * @returns Result with most saved books
   */
  async getMostSavedBooks(limit: number = 10): Promise<Result<Book[]>> {
    return this.executeAsync(
      async () => {
        const mostSaved = await this.savedBookRepository.getMostSaved(limit);

        // mostSaved returns objects with { bookId, saveCount } structure
        const books: Book[] = [];
        for (const item of mostSaved) {
          const book = await this.bookRepository.getById(item.bookId);
          if (book) books.push(book);
        }
        return books;
      },
      `getMostSavedBooks(${limit})`
    );
  }
}
