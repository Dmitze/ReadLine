import { DatabaseWrapper } from '../database/dbWrapper';
import { BaseRepository } from './BaseRepository';
import { Review } from '../database/models';
import { logger } from '../utils/logger';

export class ReviewRepository extends BaseRepository<Review> {
  constructor(db: DatabaseWrapper) {
    super(db, 'reviews');
  }

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

  async update(
    reviewId: number,
    updates: Partial<Omit<Review, 'id' | 'created_at'>>
  ): Promise<number> {
    try {
      if (Object.keys(updates).length === 0) {
        return 0;
      }

      const allowedFields = [
        'book_id',
        'user_id',
        'user_name',
        'rating',
        'comment',
        'is_published',
      ];

      const validUpdates: Record<string, any> = {};
      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          validUpdates[key] = value;
        } else {
          logger.warn(`Attempted to update forbidden field: ${key}`, { reviewId });
        }
      }

      if (Object.keys(validUpdates).length === 0) {
        return 0;
      }

      const fields = Object.keys(validUpdates)
        .map((key) => `"${key}" = ?`)
        .join(', ');
      const values = Object.values(validUpdates);

      const query = `UPDATE reviews SET ${fields} WHERE id = ?`;
      const changes = await this.db.update(query, [...values, reviewId]);

      if (changes > 0) {
        logger.info(`Review updated: ${reviewId}`, { changes, fields: Object.keys(validUpdates) });
      }
      return changes;
    } catch (error) {
      logger.error(
        'Error updating review',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

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
