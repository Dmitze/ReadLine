/**
 * Review Repository
 * REFACTOR-002: Repository Layer Separation
 *
 * All database operations related to book reviews
 */

import { DatabaseWrapper } from '../database/dbWrapper';
import { BaseRepository } from './BaseRepository';
import { Review } from '../database/models';
import { logger } from '../utils/logger';

export class ReviewRepository extends BaseRepository<Review> {
  constructor(db: DatabaseWrapper) {
    super(db, 'reviews');
  }

  /**
   * Create a new review
   */
  async create(reviewData: Omit<Review, 'id' | 'created_at'>): Promise<number> {
    try {
      const { book_id, user_id, user_name, rating, comment, is_published = false } = reviewData;

      const query = `
        INSERT INTO reviews (book_id, user_id, user_name, rating, comment, is_published)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      const reviewId = await this.db.insert(query, [
        book_id,
        user_id,
        user_name || null,
        rating,
        comment || null,
        is_published ? 1 : 0,
      ]);

      logger.info(`Review created for book ${book_id}`, { reviewId, rating });
      return reviewId;
    } catch (error) {
      logger.error(
        'Error creating review',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Get reviews for a book (published only)
   */
  async getByBookId(bookId: number): Promise<Review[]> {
    try {
      const query = `
        SELECT * FROM reviews 
        WHERE book_id = ? AND is_published = 1 
        ORDER BY created_at DESC
      `;
      return await this.db.all<Review>(query, [bookId]);
    } catch (error) {
      logger.error(
        'Error getting book reviews',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Get all pending reviews (not published)
   */
  async getPending(): Promise<Review[]> {
    try {
      const query = `
        SELECT * FROM reviews 
        WHERE is_published = 0 
        ORDER BY created_at DESC
      `;
      return await this.db.all<Review>(query, []);
    } catch (error) {
      logger.error(
        'Error getting pending reviews',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Publish a review
   */
  async publish(reviewId: number): Promise<number> {
    try {
      const query = 'UPDATE reviews SET is_published = 1 WHERE id = ?';
      return await this.db.update(query, [reviewId]);
    } catch (error) {
      logger.error(
        'Error publishing review',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Reject a review (delete it)
   */
  async reject(reviewId: number): Promise<number> {
    try {
      return await this.delete(reviewId);
    } catch (error) {
      logger.error(
        'Error rejecting review',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Get reviews by user
   */
  async getByUserId(userId: number): Promise<Review[]> {
    try {
      const query = `
        SELECT * FROM reviews 
        WHERE user_id = ? 
        ORDER BY created_at DESC
      `;
      return await this.db.all<Review>(query, [userId]);
    } catch (error) {
      logger.error(
        'Error getting user reviews',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Get average rating for a book
   */
  async getAverageRating(bookId: number): Promise<number> {
    try {
      const query = `
        SELECT AVG(rating) as avg_rating FROM reviews 
        WHERE book_id = ? AND is_published = 1
      `;
      const result = await this.db.get<{ avg_rating: number }>(query, [bookId]);
      return Math.round((result?.avg_rating || 0) * 10) / 10;
    } catch (error) {
      logger.error(
        'Error getting average rating',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Get review count for a book
   */
  async getCountForBook(bookId: number): Promise<number> {
    try {
      const query = `
        SELECT COUNT(*) as count FROM reviews 
        WHERE book_id = ? AND is_published = 1
      `;
      const result = await this.db.get<{ count: number }>(query, [bookId]);
      return result?.count || 0;
    } catch (error) {
      logger.error(
        'Error getting review count',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Check if user has reviewed a book
   */
  async hasUserReviewedBook(userId: number, bookId: number): Promise<boolean> {
    try {
      const query = `
        SELECT COUNT(*) as count FROM reviews 
        WHERE user_id = ? AND book_id = ?
      `;
      const result = await this.db.get<{ count: number }>(query, [userId, bookId]);
      return (result?.count || 0) > 0;
    } catch (error) {
      logger.error(
        'Error checking user review',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Get pending review count
   */
  async getPendingCount(): Promise<number> {
    try {
      return await this.count('is_published = 0');
    } catch (error) {
      logger.error(
        'Error getting pending review count',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Get recent reviews
   */
  async getRecent(limit: number = 20): Promise<Review[]> {
    try {
      const query = `
        SELECT * FROM reviews 
        WHERE is_published = 1 
        ORDER BY created_at DESC
        LIMIT ?
      `;
      return await this.db.all<Review>(query, [limit]);
    } catch (error) {
      logger.error(
        'Error getting recent reviews',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Get highly rated reviews (rating >= 4)
   */
  async getHighlyRated(limit: number = 20): Promise<Review[]> {
    try {
      const query = `
        SELECT * FROM reviews 
        WHERE is_published = 1 AND rating >= 4
        ORDER BY created_at DESC
        LIMIT ?
      `;
      return await this.db.all<Review>(query, [limit]);
    } catch (error) {
      logger.error(
        'Error getting highly rated reviews',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Update a review
   */
  async update(
    reviewId: number,
    updates: Partial<Omit<Review, 'id' | 'created_at'>>
  ): Promise<number> {
    try {
      if (Object.keys(updates).length === 0) {
        return 0;
      }

      const fields = Object.keys(updates)
        .map((key) => `${key} = ?`)
        .join(', ');
      const values = Object.values(updates);

      const query = `UPDATE reviews SET ${fields} WHERE id = ?`;
      return await this.db.update(query, [...values, reviewId]);
    } catch (error) {
      logger.error(
        'Error updating review',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Aliases for compatibility with services
   */
  async findByBookId(bookId: number): Promise<Review[]> {
    return this.getByBookId(bookId);
  }

  async findByUserId(userId: number): Promise<Review[]> {
    return this.getByUserId(userId);
  }

  async findPending(): Promise<Review[]> {
    return this.getPending();
  }

  async findByUserAndBook(userId: number, bookId: number): Promise<Review | undefined> {
    try {
      const query = `
        SELECT * FROM reviews 
        WHERE user_id = ? AND book_id = ? 
        ORDER BY created_at DESC
        LIMIT 1
      `;
      return await this.db.get<Review>(query, [userId, bookId]);
    } catch (error) {
      logger.error(
        'Error getting user book review',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  async deleteByBookId(bookId: number): Promise<number> {
    try {
      const query = 'DELETE FROM reviews WHERE book_id = ?';
      return await this.db.delete(query, [bookId]);
    } catch (error) {
      logger.error(
        'Error deleting book reviews',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }
}
