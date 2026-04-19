import { db } from './models';
import { logger } from '../utils/logger';
import { safeParseInt } from '../utils/helpers';

export interface BookOrder {
  id?: number;

  book_id: number;

  user_id: number;

  full_name: string;

  callsign: string;

  unit: string;

  phone: string;

  created_at?: string;
}

export interface BookOrderWithBookInfo extends BookOrder {
  book_title: string;

  book_author: string;

  book_genre: string;
}

export const createBookOrder = (order: Omit<BookOrder, 'id' | 'created_at'>): Promise<number> => {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO book_orders (book_id, user_id, full_name, callsign, unit, phone)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.run(
      query,
      [order.book_id, order.user_id, order.full_name, order.callsign, order.unit, order.phone],
      function (err) {
        if (err) {
          logger.error('Error creating book order', err);
          reject(err);
        } else {
          logger.info('Book order created', { orderId: this.lastID, userId: order.user_id });
          resolve(this.lastID);
        }
      }
    );
  });
};

export const getBookOrderById = (orderId: number): Promise<BookOrder | undefined> => {
  return new Promise((resolve, reject) => {
    const safeOrderId = safeParseInt(orderId, 0);
    if (safeOrderId <= 0) {
      reject(new Error('Invalid order ID'));
      return;
    }

    const query = 'SELECT * FROM book_orders WHERE id = ?';

    db.get(query, [safeOrderId], (err, row: BookOrder) => {
      if (err) {
        logger.error('Error getting book order', err);
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

export const getBookOrderWithBookInfo = (
  orderId: number
): Promise<BookOrderWithBookInfo | undefined> => {
  return new Promise((resolve, reject) => {
    const safeOrderId = safeParseInt(orderId, 0);
    if (safeOrderId <= 0) {
      reject(new Error('Invalid order ID'));
      return;
    }

    const query = `
      SELECT
        bo.*,
        b.title as book_title,
        b.author as book_author,
        b.genre as book_genre
      FROM book_orders bo
      JOIN books b ON bo.book_id = b.id
      WHERE bo.id = ?
    `;

    db.get(query, [safeOrderId], (err, row: BookOrderWithBookInfo) => {
      if (err) {
        logger.error('Error getting book order with info', err);
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

export const getUserBookOrders = (userId: number): Promise<BookOrderWithBookInfo[]> => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        bo.*,
        b.title as book_title,
        b.author as book_author,
        b.genre as book_genre
      FROM book_orders bo
      JOIN books b ON bo.book_id = b.id
      WHERE bo.user_id = ?
      ORDER BY bo.created_at DESC
    `;

    db.all(query, [userId], (err, rows: BookOrderWithBookInfo[]) => {
      if (err) {
        logger.error('Error getting user book orders', err);
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
};

export const getAllBookOrders = (): Promise<BookOrderWithBookInfo[]> => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        bo.*,
        b.title as book_title,
        b.author as book_author,
        b.genre as book_genre
      FROM book_orders bo
      JOIN books b ON bo.book_id = b.id
      ORDER BY bo.created_at DESC
    `;

    db.all(query, [], (err, rows: BookOrderWithBookInfo[]) => {
      if (err) {
        logger.error('Error getting all book orders', err);
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
};

export const deleteBookOrder = (orderId: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    const safeOrderId = safeParseInt(orderId, 0);
    if (safeOrderId <= 0) {
      reject(new Error('Invalid order ID'));
      return;
    }

    const query = 'DELETE FROM book_orders WHERE id = ?';

    db.run(query, [safeOrderId], (err) => {
      if (err) {
        logger.error('Error deleting book order', err);
        reject(err);
      } else {
        logger.info('Book order deleted', { orderId: safeOrderId });
        resolve();
      }
    });
  });
};

export const hasUserOrderedBook = (userId: number, bookId: number): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const safeUserId = safeParseInt(userId, 0);
    const safeBookId = safeParseInt(bookId, 0);
    if (safeUserId <= 0 || safeBookId <= 0) {
      reject(new Error('Invalid user ID or book ID'));
      return;
    }

    const query = 'SELECT COUNT(*) as count FROM book_orders WHERE user_id = ? AND book_id = ?';

    db.get(query, [safeUserId, safeBookId], (err, row: { count: number }) => {
      if (err) {
        logger.error('Error checking user book order', err);
        reject(err);
      } else {
        resolve(row?.count > 0);
      }
    });
  });
};

export const getUserOrdersCount = (userId: number): Promise<number> => {
  return new Promise((resolve, reject) => {
    const safeUserId = safeParseInt(userId, 0);
    if (safeUserId <= 0) {
      reject(new Error('Invalid user ID'));
      return;
    }

    const query = 'SELECT COUNT(*) as count FROM book_orders WHERE user_id = ?';

    db.get(query, [safeUserId], (err, row: { count: number }) => {
      if (err) {
        logger.error('Error getting user orders count', err);
        reject(err);
      } else {
        resolve(row?.count || 0);
      }
    });
  });
};
