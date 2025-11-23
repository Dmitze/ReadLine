/**
 * Book Order Functions
 * Functions for managing book orders in the ReadLine library system
 *
 * @module bookOrderFunctions
 */

import { db } from './models';
import { logger } from '../utils/logger';
import { safeParseInt } from '../utils/helpers';

/**
 * Represents a book order entity
 */
export interface BookOrder {
  /** Unique identifier for the order */
  id?: number;
  /** ID of the book being ordered */
  book_id: number;
  /** ID of the user making the order */
  user_id: number;
  /** Full name of the person receiving the book */
  full_name: string;
  /** Callsign/nickname of the recipient */
  callsign: string;
  /** Military unit or organization */
  unit: string;
  /** Phone number for contact */
  phone: string;
  /** Timestamp when order was created */
  created_at?: string;
}

/**
 * Extended book order with book information
 */
export interface BookOrderWithBookInfo extends BookOrder {
  /** Title of the ordered book */
  book_title: string;
  /** Author of the ordered book */
  book_author: string;
  /** Genre of the ordered book */
  book_genre: string;
}

/**
 * Creates a new book order in the database
 *
 * @param order - Order data without id and created_at (auto-generated)
 * @returns Promise resolving to the new order ID
 * @throws Error if database operation fails
 *
 * @example
 * ```typescript
 * const orderId = await createBookOrder({
 *   book_id: 123,
 *   user_id: 456,
 *   full_name: "John Doe",
 *   callsign: "JD",
 *   unit: "Unit A",
 *   phone: "+1234567890"
 * });
 * ```
 */
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
/**
 * Retrieves a book order by its ID
 *
 * @param orderId - Unique identifier of the order
 * @returns Promise resolving to the order data or undefined if not found
 * @throws Error if orderId is invalid or database operation fails
 *
 * @example
 * ```typescript
 * const order = await getBookOrderById(123);
 * if (order) {
 *   console.log(`Order for book ${order.book_id} by user ${order.user_id}`);
 * }
 * ```
 */
export const getBookOrderById = (orderId: number): Promise<BookOrder | undefined> => {
  return new Promise((resolve, reject) => {
    // ✅ Валідація orderId
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

// Отримати замовлення з інформацією про книгу
/**
 * Retrieves a book order with additional book information (title, author, genre)
 *
 * @param orderId - Unique identifier of the order
 * @returns Promise resolving to the order with book info or undefined if not found
 * @throws Error if orderId is invalid or database operation fails
 */
export const getBookOrderWithBookInfo = (orderId: number): Promise<BookOrderWithBookInfo | undefined> => {
  return new Promise((resolve, reject) => {
    // ✅ Валідація orderId
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

// Отримати всі замовлення користувача
/**
 * Retrieves all book orders for a specific user
 *
 * @param userId - ID of the user
 * @returns Promise resolving to array of user's orders with book info
 * @throws Error if userId is invalid or database operation fails
 */
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
/**
 * Retrieves all book orders in the system (admin function)
 *
 * @returns Promise resolving to array of all orders with book info
 * @throws Error if database operation fails
 */
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
/**
 * Deletes a book order from the database
 *
 * @param orderId - ID of the order to delete
 * @returns Promise resolving when deletion is complete
 * @throws Error if orderId is invalid or database operation fails
 */
export const deleteBookOrder = (orderId: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    // ✅ Валідація orderId
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

// Перевірити чи користувач вже замовляв цю книгу
/**
 * Checks if a user has already ordered a specific book
 *
 * @param userId - ID of the user
 * @param bookId - ID of the book
 * @returns Promise resolving to true if user has ordered this book, false otherwise
 * @throws Error if userId or bookId are invalid or database operation fails
 */
export const hasUserOrderedBook = (userId: number, bookId: number): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    // ✅ Валідація userId та bookId
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

// Отримати кількість замовлень користувача
/**
 * Gets the total count of orders for a specific user
 *
 * @param userId - ID of the user
 * @returns Promise resolving to the number of orders
 * @throws Error if userId is invalid or database operation fails
 */
export const getUserOrdersCount = (userId: number): Promise<number> => {
  return new Promise((resolve, reject) => {
    // ✅ Валідація userId
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
