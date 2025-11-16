/**
 * Saved Book Repository
 * REFACTOR-002: Repository Layer Separation
 *
 * All database operations related to user's saved/favorite books
 */

import { DatabaseWrapper } from '../database/dbWrapper';
import { BaseRepository } from './BaseRepository';
import { SavedBook } from '../database/models';
import { logger } from '../utils/logger';

export class SavedBookRepository extends BaseRepository<SavedBook> {
  constructor(db: DatabaseWrapper) {
    super(db, 'saved_books');
  }

  /**
   * Save a book for a user
   */
  async save(userId: number, bookId: number): Promise<number> {
    try {
      // Check if already saved
      const existing = await this.getBySavedId(userId, bookId);
      if (existing) {
        return existing.id!;
      }

      const query = `
        INSERT INTO saved_books (user_id, book_id)
        VALUES (?, ?)
      `;

      const id = await this.db.insert(query, [userId, bookId]);
      logger.info('Book saved by user', { userId, bookId });
      return id;
    } catch (error) {
      logger.error('Error saving book', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get saved books for a user
   */
  async getByUserId(userId: number): Promise<SavedBook[]> {
    try {
      const query = `
        SELECT * FROM saved_books 
        WHERE user_id = ? 
        ORDER BY created_at DESC
      `;
      return await this.db.all<SavedBook>(query, [userId]);
    } catch (error) {
      logger.error(
        'Error getting user saved books',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Remove a saved book
   */
  async remove(userId: number, bookId: number): Promise<number> {
    try {
      const query = 'DELETE FROM saved_books WHERE user_id = ? AND book_id = ?';
      const changes = await this.db.delete(query, [userId, bookId]);
      if (changes > 0) {
        logger.info('Book removed from saved', { userId, bookId });
      }
      return changes;
    } catch (error) {
      logger.error(
        'Error removing saved book',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Check if a book is saved by user
   */
  async isSaved(userId: number, bookId: number): Promise<boolean> {
    try {
      const query = `
        SELECT COUNT(*) as count FROM saved_books 
        WHERE user_id = ? AND book_id = ?
      `;
      const result = await this.db.get<{ count: number }>(query, [userId, bookId]);
      return (result?.count || 0) > 0;
    } catch (error) {
      logger.error(
        'Error checking if book is saved',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Get count of saved books for user
   */
  async getCountByUserId(userId: number): Promise<number> {
    try {
      return await this.count('user_id = ?', [userId]);
    } catch (error) {
      logger.error(
        'Error getting saved books count',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Clear all saved books for a user
   */
  async clearByUserId(userId: number): Promise<number> {
    try {
      const query = 'DELETE FROM saved_books WHERE user_id = ?';
      return await this.db.delete(query, [userId]);
    } catch (error) {
      logger.error(
        'Error clearing user saved books',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Get saved book by composite key
   */
  private async getBySavedId(userId: number, bookId: number): Promise<SavedBook | undefined> {
    try {
      const query = 'SELECT * FROM saved_books WHERE user_id = ? AND book_id = ?';
      return await this.db.get<SavedBook>(query, [userId, bookId]);
    } catch (error) {
      logger.error(
        'Error getting saved book',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Get most saved books
   */
  async getMostSaved(limit: number = 10): Promise<Array<{ bookId: number; saveCount: number }>> {
    try {
      const query = `
        SELECT book_id as bookId, COUNT(*) as saveCount FROM saved_books 
        GROUP BY book_id
        ORDER BY saveCount DESC
        LIMIT ?
      `;
      return await this.db.all<{ bookId: number; saveCount: number }>(query, [limit]);
    } catch (error) {
      logger.error(
        'Error getting most saved books',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Aliases for compatibility with services
   */
  async findByUserId(userId: number): Promise<SavedBook[]> {
    return this.getByUserId(userId);
  }

  async deleteByBookId(bookId: number): Promise<number> {
    try {
      const query = 'DELETE FROM saved_books WHERE book_id = ?';
      return await this.db.delete(query, [bookId]);
    } catch (error) {
      logger.error(
        'Error deleting saved books by book id',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }
}
