// Функції для роботи з замовленнями книг
import { db } from './models';
import { logger } from '../utils/logger';

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

// Створити нове замовлення
export const createBookOrder = (order: Omit<BookOrder, 'id' | 'created_at'>): Promise<number> => {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO book_orders (book_id, user_id, full_name, callsign, unit, phone)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    db.run(
      query,
      [order.book_id, order.user_id, order.full_name, order.callsign, order.unit, order.phone],
      function(err) {
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

// Отримати замовлення за ID
export const getBookOrderById = (orderId: number): Promise<BookOrder | undefined> => {
  return new Promise((resolve, reject) => {
    const query = 'SELECT * FROM book_orders WHERE id = ?';
    
    db.get(query, [orderId], (err, row: BookOrder) => {
      if (err) {
        logger.error('Error getting book order', err);
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

// Отримати замовлення з інформацією про книгу
export const getBookOrderWithBookInfo = (orderId: number): Promise<BookOrderWithBookInfo | undefined> => {
  return new Promise((resolve, reject) => {
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
    
    db.get(query, [orderId], (err, row: BookOrderWithBookInfo) => {
      if (err) {
        logger.error('Error getting book order with info', err);
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

// Отримати всі замовлення користувача
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

// Отримати всі замовлення (для адміна)
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

// Видалити замовлення
export const deleteBookOrder = (orderId: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    const query = 'DELETE FROM book_orders WHERE id = ?';
    
    db.run(query, [orderId], (err) => {
      if (err) {
        logger.error('Error deleting book order', err);
        reject(err);
      } else {
        logger.info('Book order deleted', { orderId });
        resolve();
      }
    });
  });
};

// Перевірити чи користувач вже замовляв цю книгу
export const hasUserOrderedBook = (userId: number, bookId: number): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const query = 'SELECT COUNT(*) as count FROM book_orders WHERE user_id = ? AND book_id = ?';
    
    db.get(query, [userId, bookId], (err, row: { count: number }) => {
      if (err) {
        logger.error('Error checking user book order', err);
        reject(err);
      } else {
        resolve(row.count > 0);
      }
    });
  });
};

// Отримати кількість замовлень користувача
export const getUserOrdersCount = (userId: number): Promise<number> => {
  return new Promise((resolve, reject) => {
    const query = 'SELECT COUNT(*) as count FROM book_orders WHERE user_id = ?';
    
    db.get(query, [userId], (err, row: { count: number }) => {
      if (err) {
        logger.error('Error getting user orders count', err);
        reject(err);
      } else {
        resolve(row.count);
      }
    });
  });
};
