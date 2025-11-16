/**
 * Admins Table Operations
 * REFACTOR-009: Split models.ts - Admins module
 */

import { db } from './db';
import { Admin, AdminStats, ExtendedAdminStats } from './types';
import { logger } from '../../utils/logger';

/**
 * Add admin
 */
export const addAdmin = (userId: number, username?: string): Promise<number> => {
  return new Promise((resolve, reject) => {
    const query = 'INSERT INTO admins (user_id, username) VALUES (?, ?)';

    db.run(query, [userId, username || null], function (err) {
      if (err) {
        logger.error('Error adding admin', err, { userId, username });
        reject(err);
      } else {
        logger.info('Admin added', { id: this.lastID, userId, username });
        resolve(this.lastID);
      }
    });
  });
};

/**
 * Check if user is admin
 */
export const isAdmin = (userId: number): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const query = 'SELECT COUNT(*) as count FROM admins WHERE user_id = ?';

    db.get(query, [userId], (err, row: { count: number }) => {
      if (err) {
        logger.error('Error checking if user is admin', err, { userId });
        reject(err);
      } else {
        resolve(row.count > 0);
      }
    });
  });
};

/**
 * Get all admins
 */
export const getAllAdmins = (): Promise<Admin[]> => {
  return new Promise((resolve, reject) => {
    const query = 'SELECT * FROM admins ORDER BY created_at DESC';

    db.all(query, [], (err, rows: Admin[]) => {
      if (err) {
        logger.error('Error getting all admins', err);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

/**
 * Get basic admin stats
 */
export const getAdminStats = (): Promise<AdminStats> => {
  return new Promise((resolve, reject) => {
    const query = 'SELECT COUNT(*) as totalBooks FROM books';

    db.get(query, [], (err, row: { totalBooks: number }) => {
      if (err) {
        logger.error('Error getting admin stats', err);
        reject(err);
      } else {
        resolve({ totalBooks: row.totalBooks });
      }
    });
  });
};

/**
 * Get extended admin stats
 */
export const getExtendedAdminStats = (): Promise<ExtendedAdminStats> => {
  return new Promise((resolve, reject) => {
    const queries = {
      totalBooks: 'SELECT COUNT(*) as count FROM books',
      totalUsers: 'SELECT COUNT(DISTINCT user_id) as count FROM saved_books',
      totalReviews: 'SELECT COUNT(*) as count FROM reviews',
      totalFeedback: 'SELECT COUNT(*) as count FROM feedback',
      totalSavedBooks: 'SELECT COUNT(*) as count FROM saved_books',
      avgRating: 'SELECT AVG(rating) as avg FROM books WHERE rating IS NOT NULL',
      pendingReviews: 'SELECT COUNT(*) as count FROM reviews WHERE is_published = 0',
      pendingFeedback: 'SELECT COUNT(*) as count FROM feedback WHERE status = "pending"',
      newUsersToday: 'SELECT COUNT(DISTINCT user_id) as count FROM saved_books WHERE DATE(created_at) = DATE(\'now\')',
      newBooksThisMonth: 'SELECT COUNT(*) as count FROM books WHERE DATE(created_at) >= DATE(\'now\', \'start of month\')',
      activeUsersThisMonth: 'SELECT COUNT(DISTINCT user_id) as count FROM saved_books WHERE DATE(created_at) >= DATE(\'now\', \'start of month\')',
      topGenres: 'SELECT genre, COUNT(*) as count FROM books GROUP BY genre ORDER BY count DESC LIMIT 5',
      topRatedBooks: 'SELECT title, rating, author FROM books WHERE rating IS NOT NULL ORDER BY rating DESC LIMIT 5'
    };

    const stats: any = {};

    db.get(queries.totalBooks, [], (err, row: any) => {
      if (err) return reject(err);
      stats.totalBooks = row.count;

      db.get(queries.totalUsers, [], (err, row: any) => {
        if (err) return reject(err);
        stats.totalUsers = row.count;

        db.get(queries.totalReviews, [], (err, row: any) => {
          if (err) return reject(err);
          stats.totalReviews = row.count;

          db.get(queries.totalFeedback, [], (err, row: any) => {
            if (err) return reject(err);
            stats.totalFeedback = row.count;

            db.get(queries.totalSavedBooks, [], (err, row: any) => {
              if (err) return reject(err);
              stats.totalSavedBooks = row.count;

              db.get(queries.avgRating, [], (err, row: any) => {
                if (err) return reject(err);
                stats.avgRating = row.avg || 0;

                db.get(queries.pendingReviews, [], (err, row: any) => {
                  if (err) return reject(err);
                  stats.pendingReviews = row.count;

                  db.get(queries.pendingFeedback, [], (err, row: any) => {
                    if (err) return reject(err);
                    stats.pendingFeedback = row.count;

                    db.get(queries.newUsersToday, [], (err, row: any) => {
                      if (err) return reject(err);
                      stats.newUsersToday = row.count;

                      db.get(queries.newBooksThisMonth, [], (err, row: any) => {
                        if (err) return reject(err);
                        stats.newBooksThisMonth = row.count;

                        db.get(queries.activeUsersThisMonth, [], (err, row: any) => {
                          if (err) return reject(err);
                          stats.activeUsersThisMonth = row.count;

                          db.all(queries.topGenres, [], (err, rows: any[]) => {
                            if (err) return reject(err);
                            stats.topGenres = rows;

                            db.all(queries.topRatedBooks, [], (err, rows: any[]) => {
                              if (err) return reject(err);
                              stats.topRatedBooks = rows;

                              resolve(stats);
                            });
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
};

/**
 * Remove admin
 */
export const removeAdmin = (userId: number): Promise<number> => {
  return new Promise((resolve, reject) => {
    const query = 'DELETE FROM admins WHERE user_id = ?';

    db.run(query, [userId], function (err) {
      if (err) {
        logger.error('Error removing admin', err, { userId });
        reject(err);
      } else {
        logger.info('Admin removed', { userId, changes: this.changes });
        resolve(this.changes);
      }
    });
  });
};
