import { db } from './db';
import { Review } from './types';
import { logger } from '../../utils/logger';

export const addReview = (reviewData: Omit<Review, 'id' | 'created_at'>): Promise<number> => {
  return new Promise((resolve, reject) => {
    const { book_id, user_id, user_name, rating, comment, is_published = false } = reviewData;

    const query = `
      INSERT INTO reviews (book_id, user_id, user_name, rating, comment, is_published)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.run(
      query,
      [book_id, user_id, user_name || null, rating, comment || null, is_published ? 1 : 0],
      function (err) {
        if (err) {
          logger.error('Error adding review', err, { book_id, user_id, rating });
          reject(err);
        } else {
          logger.info('Review added successfully', { id: this.lastID, book_id, user_id });
          resolve(this.lastID);
        }
      }
    );
  });
};

export const getBookReviews = (bookId: number): Promise<Review[]> => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT r.*, 
        COALESCE(u.first_name, 'Читач') as user_first_name,
        u.username as user_username
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.user_id
      WHERE r.book_id = ? AND r.is_published = 1 
      ORDER BY r.created_at DESC
    `;

    db.all(query, [bookId], (err, rows: Review[]) => {
      if (err) {
        logger.error('Error getting book reviews', err, { bookId });
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

export const getPendingReviews = (): Promise<Review[]> => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT r.*, b.title as book_title, b.author as book_author
      FROM reviews r
      LEFT JOIN books b ON r.book_id = b.id
      WHERE r.is_published = 0
      ORDER BY r.created_at ASC
    `;

    db.all(query, [], (err, rows: Review[]) => {
      if (err) {
        logger.error('Error getting pending reviews', err);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

export const approveReview = (reviewId: number): Promise<number> => {
  return new Promise((resolve, reject) => {
    const query = 'UPDATE reviews SET is_published = 1 WHERE id = ?';

    db.run(query, [reviewId], function (err) {
      if (err) {
        logger.error('Error approving review', err, { reviewId });
        reject(err);
      } else {
        logger.info('Review approved', { reviewId, changes: this.changes });
        resolve(this.changes);
      }
    });
  });
};

export const deleteReview = (reviewId: number): Promise<number> => {
  return new Promise((resolve, reject) => {
    const query = 'DELETE FROM reviews WHERE id = ?';

    db.run(query, [reviewId], function (err) {
      if (err) {
        logger.error('Error deleting review', err, { reviewId });
        reject(err);
      } else {
        logger.info('Review deleted', { reviewId, changes: this.changes });
        resolve(this.changes);
      }
    });
  });
};

export const publishReview = (reviewId: number): Promise<number> => {
  return approveReview(reviewId);
};

export const updateBookRating = (bookId: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE books
      SET 
        rating = (
          SELECT AVG(rating) 
          FROM reviews 
          WHERE book_id = ? AND is_published = 1
        ),
        reviews_count = (
          SELECT COUNT(*) 
          FROM reviews 
          WHERE book_id = ? AND is_published = 1
        )
      WHERE id = ?
    `;

    db.run(query, [bookId, bookId, bookId], (err) => {
      if (err) {
        logger.error('Error updating book rating', err, { bookId });
        reject(err);
      } else {
        logger.info('Book rating updated', { bookId });
        resolve();
      }
    });
  });
};
