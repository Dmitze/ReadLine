/**
 * Stats Table Operations
 * REFACTOR-009: Split models.ts - Stats module
 */

import { db } from './db';
import { logger } from '../../utils/logger';

/**
 * Get detailed book statistics
 */
export const getBookDetailedStats = (bookId: number): Promise<any> => {
  return new Promise(async (resolve, reject) => {
    try {
      // Get book info
      const book = await new Promise<any>((res, rej) => {
        db.get('SELECT * FROM books WHERE id = ?', [bookId], (err, row) => {
          if (err) rej(err);
          else res(row);
        });
      });

      if (!book) {
        reject(new Error(`Book with id ${bookId} not found`));
        return;
      }

      // Get rating distribution
      const ratingDistribution = await new Promise<any>((res, rej) => {
        db.all(
          `SELECT rating, COUNT(*) as count FROM reviews 
           WHERE book_id = ? AND is_published = 1 
           GROUP BY rating`,
          [bookId],
          (err, rows: Array<{ rating: number; count: number }>) => {
            if (err) rej(err);
            else {
              const distribution = {
                rating_1_count: 0,
                rating_2_count: 0,
                rating_3_count: 0,
                rating_4_count: 0,
                rating_5_count: 0
              };

              if (rows && rows.length > 0) {
                const totalReviews = rows.reduce((sum, r) => sum + r.count, 0);
                rows.forEach(row => {
                  const key = `rating_${row.rating}_count` as keyof typeof distribution;
                  distribution[key] = row.count;
                });

                res({ ...distribution, totalReviews });
              } else {
                res({ ...distribution, totalReviews: 0 });
              }
            }
          }
        );
      });

      // Get readers count
      const readersCount = await new Promise<number>((res, rej) => {
        db.get(
          'SELECT COUNT(*) as count FROM saved_books WHERE book_id = ?',
          [bookId],
          (err, row: any) => {
            if (err) rej(err);
            else res(row?.count || 0);
          }
        );
      });

      // Get popular quotes
      const popularQuotes = await new Promise<string[]>((res, rej) => {
        db.all(
          `SELECT comment FROM reviews 
           WHERE book_id = ? AND is_published = 1 AND comment IS NOT NULL 
           ORDER BY rating DESC LIMIT 5`,
          [bookId],
          (err, rows: Array<{ comment: string }>) => {
            if (err) rej(err);
            else res((rows || []).map(r => r.comment).filter(c => c && c.length > 0));
          }
        );
      });

      const result = {
        book,
        rating_stats: ratingDistribution,
        readers_count: readersCount,
        popular_quotes: popularQuotes
      };

      logger.info('Book detailed stats retrieved', { bookId });
      resolve(result);
    } catch (error) {
      logger.error('Error getting book detailed stats', error, { bookId });
      reject(error);
    }
  });
};
