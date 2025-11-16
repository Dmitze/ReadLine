/**
 * Book Requests Table
 * Таблиця для заявок на фізичні книги
 */

import { db } from './db';
import { logger } from '../../utils/logger';

/**
 * Book Request Status
 */
export enum BookRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ISSUED = 'issued',
  RETURNED = 'returned',
  OVERDUE = 'overdue',
}

/**
 * Book Request Priority
 */
export enum BookRequestPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * Book Request Interface
 */
export interface BookRequest {
  id?: number;
  user_id: number;
  book_title: string;
  book_author: string;
  book_genre?: string;
  status: BookRequestStatus;
  priority: BookRequestPriority;
  comment?: string;
  admin_comment?: string;
  issued_at?: string;
  due_date?: string;
  returned_at?: string;
  created_at?: string;
  updated_at?: string;
  reviewed_by?: number;
  reviewed_at?: string;
}

/**
 * Book Request Statistics Interface
 */
export interface BookRequestStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  issued: number;
  returned: number;
  overdue: number;
}

/**
 * Створити таблицю book_requests
 */
export const createBookRequestsTable = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.exec(
      `
      CREATE TABLE IF NOT EXISTS book_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        book_title TEXT NOT NULL,
        book_author TEXT NOT NULL,
        book_genre TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'issued', 'returned', 'overdue')),
        priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
        comment TEXT,
        admin_comment TEXT,
        issued_at DATETIME,
        due_date DATETIME,
        returned_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        reviewed_by INTEGER,
        reviewed_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewed_by) REFERENCES admins(id)
      );

      CREATE INDEX IF NOT EXISTS idx_book_requests_user ON book_requests(user_id);
      CREATE INDEX IF NOT EXISTS idx_book_requests_status ON book_requests(status);
      CREATE INDEX IF NOT EXISTS idx_book_requests_priority ON book_requests(priority);
      CREATE INDEX IF NOT EXISTS idx_book_requests_due_date ON book_requests(due_date);
      CREATE INDEX IF NOT EXISTS idx_book_requests_created_at ON book_requests(created_at);
      `,
      (err) => {
        if (err) {
          logger.error('Error creating book_requests table', err);
          reject(err);
        } else {
          logger.info('Book requests table created successfully');
          resolve();
        }
      }
    );
  });
};

/**
 * Створити нову заявку
 */
export const createBookRequest = (request: Omit<BookRequest, 'id' | 'created_at' | 'updated_at'>): Promise<number> => {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO book_requests (
        user_id, book_title, book_author, book_genre, status, priority, comment
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(
      query,
      [
        request.user_id,
        request.book_title,
        request.book_author,
        request.book_genre || null,
        request.status || BookRequestStatus.PENDING,
        request.priority || BookRequestPriority.MEDIUM,
        request.comment || null,
      ],
      function (err) {
        if (err) {
          logger.error('Error creating book request', err, request);
          reject(err);
        } else {
          logger.info('Book request created', { id: this.lastID, user_id: request.user_id });
          resolve(this.lastID);
        }
      }
    );
  });
};

/**
 * Отримати заявку за ID
 */
export const getBookRequestById = (requestId: number): Promise<BookRequest | undefined> => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM book_requests WHERE id = ?', [requestId], (err, row: BookRequest) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

/**
 * Отримати всі заявки користувача
 */
export const getUserBookRequests = (userId: number): Promise<BookRequest[]> => {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM book_requests WHERE user_id = ? ORDER BY created_at DESC',
      [userId],
      (err, rows: BookRequest[]) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
};

/**
 * Отримати заявки за статусом
 */
export const getBookRequestsByStatus = (status: BookRequestStatus): Promise<BookRequest[]> => {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM book_requests WHERE status = ? ORDER BY priority DESC, created_at ASC',
      [status],
      (err, rows: BookRequest[]) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
};

/**
 * Отримати всі заявки (для адміна)
 */
export const getAllBookRequests = (limit?: number): Promise<BookRequest[]> => {
  return new Promise((resolve, reject) => {
    const query = limit
      ? 'SELECT * FROM book_requests ORDER BY created_at DESC LIMIT ?'
      : 'SELECT * FROM book_requests ORDER BY created_at DESC';

    const params = limit ? [limit] : [];

    db.all(query, params, (err, rows: BookRequest[]) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

/**
 * Оновити статус заявки
 */
export const updateBookRequestStatus = (
  requestId: number,
  status: BookRequestStatus,
  adminId?: number,
  adminComment?: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE book_requests 
      SET status = ?, 
          updated_at = CURRENT_TIMESTAMP, 
          reviewed_by = ?,
          reviewed_at = CURRENT_TIMESTAMP,
          admin_comment = ?
      WHERE id = ?
    `;

    db.run(query, [status, adminId || null, adminComment || null, requestId], function (err) {
      if (err) {
        logger.error('Error updating book request status', err, { requestId, status });
        reject(err);
      } else {
        logger.info('Book request status updated', { requestId, status, changes: this.changes });
        resolve();
      }
    });
  });
};

/**
 * Видати книгу (встановити статус "issued")
 */
export const issueBook = (requestId: number, daysToReturn: number, adminId: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE book_requests 
      SET status = ?, 
          issued_at = CURRENT_TIMESTAMP,
          due_date = datetime('now', '+' || ? || ' days'),
          updated_at = CURRENT_TIMESTAMP,
          reviewed_by = ?,
          reviewed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    db.run(query, [BookRequestStatus.ISSUED, daysToReturn, adminId, requestId], function (err) {
      if (err) {
        logger.error('Error issuing book', err, { requestId });
        reject(err);
      } else {
        logger.info('Book issued', { requestId, daysToReturn, changes: this.changes });
        resolve();
      }
    });
  });
};

/**
 * Повернути книгу
 */
export const returnBook = (requestId: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE book_requests 
      SET status = ?, 
          returned_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    db.run(query, [BookRequestStatus.RETURNED, requestId], function (err) {
      if (err) {
        logger.error('Error returning book', err, { requestId });
        reject(err);
      } else {
        logger.info('Book returned', { requestId, changes: this.changes });
        resolve();
      }
    });
  });
};

/**
 * Отримати статистику заявок
 */
export const getBookRequestsStats = (): Promise<BookRequestStats> => {
  return new Promise((resolve, reject) => {
    db.get(
      `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN status = 'issued' THEN 1 ELSE 0 END) as issued,
        SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END) as returned,
        SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) as overdue
      FROM book_requests
      `,
      [],
      (err, row: BookRequestStats) => {
        if (err) reject(err);
        else resolve(row || { total: 0, pending: 0, approved: 0, rejected: 0, issued: 0, returned: 0, overdue: 0 });
      }
    );
  });
};

/**
 * Отримати прострочені заявки
 */
export const getOverdueRequests = (): Promise<BookRequest[]> => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM book_requests 
       WHERE status = 'issued' 
       AND due_date < datetime('now')
       ORDER BY due_date ASC`,
      [],
      (err, rows: BookRequest[]) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
};

/**
 * Позначити прострочені заявки
 */
export const markOverdueRequests = (): Promise<number> => {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE book_requests 
       SET status = 'overdue', updated_at = CURRENT_TIMESTAMP
       WHERE status = 'issued' 
       AND due_date < datetime('now')`,
      [],
      function (err) {
        if (err) {
          logger.error('Error marking overdue requests', err);
          reject(err);
        } else {
          logger.info('Marked overdue requests', { count: this.changes });
          resolve(this.changes);
        }
      }
    );
  });
};

/**
 * Видалити заявку
 */
export const deleteBookRequest = (requestId: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM book_requests WHERE id = ?', [requestId], function (err) {
      if (err) {
        logger.error('Error deleting book request', err, { requestId });
        reject(err);
      } else {
        logger.info('Book request deleted', { requestId, changes: this.changes });
        resolve();
      }
    });
  });
};
