import { db } from './db';
import { Book } from './types';
import { logger } from '../../utils/logger';

export const saveBook = (userId: number, bookId: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    const query = 'INSERT OR IGNORE INTO saved_books (user_id, book_id) VALUES (?, ?)';

    db.run(query, [userId, bookId], (err) => {
      if (err) {
        logger.error('Error saving book', err, { userId, bookId });
        reject(err);
      } else {
        logger.info('Book saved', { userId, bookId });
        resolve();
      }
    });
  });
};

export const unsaveBook = (userId: number, bookId: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    const query = 'DELETE FROM saved_books WHERE user_id = ? AND book_id = ?';

    db.run(query, [userId, bookId], (err) => {
      if (err) {
        logger.error('Error unsaving book', err, { userId, bookId });
        reject(err);
      } else {
        logger.info('Book unsaved', { userId, bookId });
        resolve();
      }
    });
  });
};

export const isBookSaved = (userId: number, bookId: number): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const query = 'SELECT COUNT(*) as count FROM saved_books WHERE user_id = ? AND book_id = ?';

    db.get(query, [userId, bookId], (err, row: { count: number }) => {
      if (err) {
        logger.error('Error checking if book is saved', err, { userId, bookId });
        reject(err);
      } else {
        resolve(row.count > 0);
      }
    });
  });
};

export const getSavedBooks = (userId: number): Promise<Book[]> => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT b.* 
      FROM books b
      INNER JOIN saved_books sb ON b.id = sb.book_id
      WHERE sb.user_id = ?
      ORDER BY sb.created_at DESC
    `;

    db.all(query, [userId], (err, rows: Book[]) => {
      if (err) {
        logger.error('Error getting saved books', err, { userId });
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

export const getSavedBooksCount = (userId: number): Promise<number> => {
  return new Promise((resolve, reject) => {
    const query = 'SELECT COUNT(*) as count FROM saved_books WHERE user_id = ?';

    db.get(query, [userId], (err, row: { count: number }) => {
      if (err) {
        logger.error('Error getting saved books count', err, { userId });
        reject(err);
      } else {
        resolve(row.count);
      }
    });
  });
};
