/**
 * Optimized Book Repository
 * REFACTOR-012: Database Query Optimization
 *
 * High-performance book repository with caching, indexes, and batch operations
 */

import { DatabaseWrapper } from '../database/dbWrapper';
import { OptimizedRepository, PaginatedResult } from './OptimizedRepository';
import { QueryOptimizer } from '../database/QueryOptimizer';
import { Book } from '../database/models';
import { logger } from '../utils/logger';

export class OptimizedBookRepository extends OptimizedRepository<Book> {
  constructor(
    db: DatabaseWrapper,
    optimizer?: QueryOptimizer
  ) {
    super(db, 'books', optimizer);
  }

  /**
   * Initialize indexes for books table
   */
  async initializeIndexes(): Promise<void> {
    try {
      await this.queryOptimizer.createIndex({
        tableName: 'books',
        columns: ['genre'],
        name: 'idx_books_genre',
      });

      await this.queryOptimizer.createIndex({
        tableName: 'books',
        columns: ['author'],
        name: 'idx_books_author',
      });

      await this.queryOptimizer.createIndex({
        tableName: 'books',
        columns: ['rating'],
        name: 'idx_books_rating',
      });

      await this.queryOptimizer.createIndex({
        tableName: 'books',
        columns: ['created_at'],
        name: 'idx_books_created_at',
      });

      await this.queryOptimizer.createIndex({
        tableName: 'books',
        columns: ['is_available'],
        name: 'idx_books_is_available',
      });

      await this.queryOptimizer.createIndex({
        tableName: 'books',
        columns: ['genre', 'rating'],
        name: 'idx_books_genre_rating',
      });

      logger.info('Book indexes initialized');
    } catch (error) {
      logger.error('Error initializing indexes', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Create book with optimization
   */
  async create(book: Omit<Book, 'id' | 'created_at'>): Promise<number> {
    try {
      const {
        title,
        author,
        genre,
        description,
        photo_file_id,
        file_url,
        audio_file_id,
        online_link,
        file_type,
        file_name,
      } = book;

      const query = `
        INSERT INTO books (
          title, author, genre, description, photo_file_id,
          file_url, audio_file_id, online_link, file_type, file_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const bookId = await this.db.insert(query, [
        title,
        author,
        genre,
        description,
        photo_file_id,
        file_url || null,
        audio_file_id || null,
        online_link || null,
        file_type || 'physical',
        file_name || null,
      ]);

      // Invalidate relevant caches
      this.queryOptimizer.invalidateTableCache('books');

      logger.info(`Book created: ${title}`, { bookId });
      return bookId;
    } catch (error) {
      logger.error('Error creating book', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get books by genre with pagination and caching
   */
  async getByGenrePaginated(
    genre: string,
    limit: number = 5,
    offset: number = 0
  ): Promise<PaginatedResult<Book>> {
    try {
      const cacheKey = `books:genre:${genre}:${limit}:${offset}`;

      // Parallel queries for count and data
      const [data, total] = await Promise.all([
        this.queryOptimizer.executeOptimized<Book>(
          'SELECT * FROM books WHERE genre = ? ORDER BY rating DESC LIMIT ? OFFSET ?',
          [genre, limit, offset],
          `${cacheKey}:data`,
          300000
        ),
        this.queryOptimizer.getOptimized<{ count: number }>(
          'SELECT COUNT(*) as count FROM books WHERE genre = ?',
          [genre],
          `${cacheKey}:count`,
          300000
        ),
      ]);

      const totalCount = total?.count || 0;
      const page = Math.floor(offset / limit) + 1;
      const totalPages = Math.ceil(totalCount / limit);

      return {
        data,
        total: totalCount,
        limit,
        offset,
        page,
        totalPages,
      };
    } catch (error) {
      logger.error('Error getting books by genre with pagination', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Search books with optimization
   */
  async searchOptimized(
    searchTerm: string,
    limit: number = 10
  ): Promise<Book[]> {
    try {
      const pattern = `%${searchTerm}%`;
      const cacheKey = `books:search:${searchTerm}:${limit}`;

      const query = `
        SELECT * FROM books 
        WHERE (LOWER(title) LIKE LOWER(?) 
           OR LOWER(author) LIKE LOWER(?)
           OR LOWER(genre) LIKE LOWER(?))
        AND is_available = 1
        ORDER BY rating DESC
        LIMIT ?
      `;

      return await this.queryOptimizer.executeOptimized<Book>(
        query,
        [pattern, pattern, pattern, limit],
        cacheKey,
        300000
      );
    } catch (error) {
      logger.error('Error searching books', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get top rated books with caching
   */
  async getTopRated(limit: number = 10): Promise<Book[]> {
    try {
      const cacheKey = `books:top_rated:${limit}`;

      const query = `
        SELECT * FROM books 
        WHERE is_available = 1
        ORDER BY rating DESC, reviews_count DESC
        LIMIT ?
      `;

      return await this.queryOptimizer.executeOptimized<Book>(
        query,
        [limit],
        cacheKey,
        600000 // 10 minutes
      );
    } catch (error) {
      logger.error('Error getting top rated books', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get newest books with caching
   */
  async getNewest(limit: number = 10): Promise<Book[]> {
    try {
      const cacheKey = `books:newest:${limit}`;

      const query = `
        SELECT * FROM books 
        WHERE is_available = 1
        ORDER BY created_at DESC
        LIMIT ?
      `;

      return await this.queryOptimizer.executeOptimized<Book>(
        query,
        [limit],
        cacheKey,
        600000
      );
    } catch (error) {
      logger.error('Error getting newest books', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get random book with caching
   */
  async getRandom(): Promise<Book | undefined> {
    try {
      const cacheKey = 'books:random';

      const query = `
        SELECT * FROM books 
        WHERE is_available = 1
        ORDER BY RANDOM()
        LIMIT 1
      `;

      return await this.queryOptimizer.getOptimized<Book>(
        query,
        [],
        cacheKey,
        300000
      );
    } catch (error) {
      logger.error('Error getting random book', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get all genres with caching
   */
  async getAllGenres(): Promise<string[]> {
    try {
      const cacheKey = 'books:all_genres';

      const query = `
        SELECT DISTINCT genre FROM books 
        WHERE is_available = 1
        ORDER BY genre ASC
      `;

      const results = await this.queryOptimizer.executeOptimized<{ genre: string }>(
        query,
        [],
        cacheKey,
        3600000 // 1 hour - genres change infrequently
      );

      return results.map((r) => r.genre);
    } catch (error) {
      logger.error('Error getting all genres', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Increment downloads count
   */
  async incrementDownloads(bookId: number): Promise<void> {
    try {
      const query = 'UPDATE books SET downloads_count = downloads_count + 1 WHERE id = ?';
      await this.db.update(query, [bookId]);

      // Invalidate caches
      this.queryOptimizer.invalidateTableCache(`books:id:${bookId}`);
      this.queryOptimizer.invalidateTableCache('books:top_rated');
    } catch (error) {
      logger.error('Error incrementing downloads', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get low rated books for review
   */
  async getLowRatedBooks(maxRating: number = 2, limit: number = 20): Promise<Book[]> {
    try {
      const query = `
        SELECT * FROM books 
        WHERE rating <= ? AND reviews_count >= 3
        ORDER BY rating ASC, reviews_count DESC
        LIMIT ?
      `;

      return await this.queryOptimizer.executeOptimized<Book>(
        query,
        [maxRating, limit],
        `books:low_rated:${maxRating}:${limit}`,
        300000
      );
    } catch (error) {
      logger.error('Error getting low rated books', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get books by author with pagination
   */
  async getByAuthorPaginated(
    author: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<PaginatedResult<Book>> {
    try {
      const cacheKey = `books:author:${author}:${limit}:${offset}`;

      const [data, total] = await Promise.all([
        this.queryOptimizer.executeOptimized<Book>(
          'SELECT * FROM books WHERE LOWER(author) = LOWER(?) ORDER BY rating DESC LIMIT ? OFFSET ?',
          [author, limit, offset],
          `${cacheKey}:data`,
          300000
        ),
        this.queryOptimizer.getOptimized<{ count: number }>(
          'SELECT COUNT(*) as count FROM books WHERE LOWER(author) = LOWER(?)',
          [author],
          `${cacheKey}:count`,
          300000
        ),
      ]);

      const totalCount = total?.count || 0;
      const page = Math.floor(offset / limit) + 1;
      const totalPages = Math.ceil(totalCount / limit);

      return {
        data,
        total: totalCount,
        limit,
        offset,
        page,
        totalPages,
      };
    } catch (error) {
      logger.error('Error getting books by author', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Update rating for a book
   */
  async updateRating(bookId: number, newRating: number, reviewsCount: number): Promise<number> {
    try {
      const query = 'UPDATE books SET rating = ?, reviews_count = ? WHERE id = ?';
      const changes = await this.db.update(query, [newRating, reviewsCount, bookId]);

      // Invalidate relevant caches
      this.queryOptimizer.invalidateTableCache(`books:id:${bookId}`);
      this.queryOptimizer.invalidateTableCache('books:top_rated');

      return changes;
    } catch (error) {
      logger.error('Error updating rating', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get books summary for dashboard
   */
  async getDashboardSummary(): Promise<{
    totalBooks: number;
    availableBooks: number;
    topRated: Book[];
    newest: Book[];
  }> {
    try {
      const cacheKey = 'books:dashboard_summary';

      // Check if we have cached summary
      const queryResult = await this.queryOptimizer.getOptimized<any>(
        'SELECT 1',
        [],
        cacheKey,
        600000
      );

      if (queryResult) {
        // Return cached result
        return JSON.parse(JSON.stringify(queryResult));
      }

      // Fetch all data in parallel
      const [totalBooks, availableBooks, topRated, newest] = await Promise.all([
        this.count(),
        this.count({ is_available: 1 }),
        this.getTopRated(5),
        this.getNewest(5),
      ]);

      const summary = {
        totalBooks,
        availableBooks,
        topRated,
        newest,
      };

      return summary;
    } catch (error) {
      logger.error('Error getting dashboard summary', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Analyze books table for optimization
   */
  async analyzeTableOptimization(): Promise<void> {
    try {
      const analysis = await this.queryOptimizer.analyzeTable('books');
      logger.info('Books table analysis', analysis);
    } catch (error) {
      logger.error('Error analyzing table', error instanceof Error ? error : new Error(String(error)));
    }
  }
}
