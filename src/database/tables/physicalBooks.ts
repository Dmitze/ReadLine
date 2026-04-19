import { db } from './db';
import { logger } from '../../utils/logger';

export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
export type BookCondition = 'new' | 'like_new' | 'good' | 'acceptable' | 'poor';
export type LoanStatus = 'active' | 'returned' | 'overdue' | 'lost';

export interface PhysicalBookRequest {
  id?: number;
  user_id: number;
  book_title: string;
  book_author: string;
  book_genre?: string;
  book_description?: string;
  book_cover_url?: string;
  status: RequestStatus;
  priority?: number;
  notes?: string;
  admin_notes?: string;
  rejection_reason?: string;
  requested_at?: string;
  reviewed_at?: string;
  reviewed_by?: number;
  completed_at?: string;
}

export interface PhysicalBook {
  id?: number;
  book_id?: number;
  title: string;
  author: string;
  isbn?: string;
  quantity_total: number;
  quantity_available: number;
  condition: BookCondition;
  location?: string;
  notes?: string;
  added_at?: string;
  added_by?: number;
}

export interface BookLoan {
  id?: number;
  physical_book_id: number;
  user_id: number;
  request_id?: number;
  issued_at?: string;
  due_date: string;
  returned_at?: string;
  status: LoanStatus;
  issued_by?: number;
  notes?: string;
}

export interface RequestHistory {
  id?: number;
  request_id: number;
  old_status?: string;
  new_status: string;
  changed_by?: number;
  change_reason?: string;
  changed_at?: string;
}

export const initPhysicalBooksSystem = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const sql = `
      -- Таблиця заявок на книги
      CREATE TABLE IF NOT EXISTS physical_book_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        book_title TEXT NOT NULL,
        book_author TEXT NOT NULL,
        book_genre TEXT,
        book_description TEXT,
        book_cover_url TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled')),
        priority INTEGER DEFAULT 0,
        notes TEXT,
        admin_notes TEXT,
        rejection_reason TEXT,
        requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        reviewed_at DATETIME,
        reviewed_by INTEGER,
        completed_at DATETIME
      );

      -- Таблиця фізичних книг
      CREATE TABLE IF NOT EXISTS physical_books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id INTEGER,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        isbn TEXT,
        quantity_total INTEGER DEFAULT 1,
        quantity_available INTEGER DEFAULT 1,
        condition TEXT DEFAULT 'new' CHECK(condition IN ('new', 'like_new', 'good', 'acceptable', 'poor')),
        location TEXT,
        notes TEXT,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        added_by INTEGER
      );

      -- Таблиця видачі книг
      CREATE TABLE IF NOT EXISTS book_loans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        physical_book_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        request_id INTEGER,
        issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        due_date DATETIME NOT NULL,
        returned_at DATETIME,
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'returned', 'overdue', 'lost')),
        issued_by INTEGER,
        notes TEXT,
        FOREIGN KEY (physical_book_id) REFERENCES physical_books(id) ON DELETE CASCADE
      );

      -- Таблиця історії змін
      CREATE TABLE IF NOT EXISTS request_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        request_id INTEGER NOT NULL,
        old_status TEXT,
        new_status TEXT NOT NULL,
        changed_by INTEGER,
        change_reason TEXT,
        changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (request_id) REFERENCES physical_book_requests(id) ON DELETE CASCADE
      );

      -- Індекси для швидкого пошуку
      CREATE INDEX IF NOT EXISTS idx_physical_requests_user ON physical_book_requests(user_id);
      CREATE INDEX IF NOT EXISTS idx_physical_requests_status ON physical_book_requests(status);
      CREATE INDEX IF NOT EXISTS idx_physical_requests_priority ON physical_book_requests(priority DESC);
      CREATE INDEX IF NOT EXISTS idx_physical_books_available ON physical_books(quantity_available);
      CREATE INDEX IF NOT EXISTS idx_book_loans_user ON book_loans(user_id);
      CREATE INDEX IF NOT EXISTS idx_book_loans_status ON book_loans(status);
      CREATE INDEX IF NOT EXISTS idx_book_loans_due ON book_loans(due_date);
    `;

    db.exec(sql, (err) => {
      if (err) {
        logger.error('Error initializing physical books system', err);
        reject(err);
      } else {
        logger.info('Physical books system initialized successfully');
        resolve();
      }
    });
  });
};

export const createRequest = async (request: PhysicalBookRequest): Promise<number> => {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO physical_book_requests (
        user_id, book_title, book_author, book_genre, 
        book_description, book_cover_url, notes, priority
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(
      query,
      [
        request.user_id,
        request.book_title,
        request.book_author,
        request.book_genre || null,
        request.book_description || null,
        request.book_cover_url || null,
        request.notes || null,
        request.priority || 0,
      ],
      function (err) {
        if (err) {
          logger.error('Error creating request', err);
          reject(err);
        } else {
          logger.info('Request created', { id: this.lastID, user_id: request.user_id });
          resolve(this.lastID);
        }
      }
    );
  });
};

export const getRequestById = async (id: number): Promise<PhysicalBookRequest | undefined> => {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM physical_book_requests WHERE id = ?',
      [id],
      (err, row: PhysicalBookRequest) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
};

export const getUserRequests = async (userId: number): Promise<PhysicalBookRequest[]> => {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM physical_book_requests WHERE user_id = ? ORDER BY requested_at DESC',
      [userId],
      (err, rows: PhysicalBookRequest[]) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
};

export const getRequestsByStatus = async (
  status: RequestStatus
): Promise<PhysicalBookRequest[]> => {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM physical_book_requests WHERE status = ? ORDER BY priority DESC, requested_at ASC',
      [status],
      (err, rows: PhysicalBookRequest[]) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
};

export const updateRequestStatus = async (
  requestId: number,
  newStatus: RequestStatus,
  adminId?: number,
  reason?: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT status FROM physical_book_requests WHERE id = ?',
      [requestId],
      (err, row: { status: string }) => {
        if (err) {
          reject(err);
          return;
        }

        const oldStatus = row?.status;

        const updateQuery = `
        UPDATE physical_book_requests 
        SET status = ?, reviewed_at = CURRENT_TIMESTAMP, reviewed_by = ?, 
            rejection_reason = ?, 
            completed_at = CASE WHEN ? = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END
        WHERE id = ?
      `;

        db.run(
          updateQuery,
          [newStatus, adminId || null, reason || null, newStatus, requestId],
          (updateErr) => {
            if (updateErr) {
              logger.error('Error updating request status', updateErr);
              reject(updateErr);
              return;
            }

            addHistory(requestId, oldStatus, newStatus, adminId, reason)
              .then(() => {
                logger.info('Request status updated', { requestId, oldStatus, newStatus });
                resolve();
              })
              .catch((historyErr) => {
                logger.error('Error adding history', historyErr);
                resolve();
              });
          }
        );
      }
    );
  });
};

export const cancelRequest = async (requestId: number, userId: number): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE physical_book_requests SET status = ? WHERE id = ? AND user_id = ? AND status = ?',
      ['cancelled', requestId, userId, 'pending'],
      function (err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      }
    );
  });
};

export const countRequests = async (status: RequestStatus): Promise<number> => {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT COUNT(*) as count FROM physical_book_requests WHERE status = ?',
      [status],
      (err, row: { count: number }) => {
        if (err) reject(err);
        else resolve(row?.count || 0);
      }
    );
  });
};

export const addPhysicalBook = async (book: PhysicalBook): Promise<number> => {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO physical_books (
        book_id, title, author, isbn, quantity_total, 
        quantity_available, condition, location, notes, added_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(
      query,
      [
        book.book_id || null,
        book.title,
        book.author,
        book.isbn || null,
        book.quantity_total,
        book.quantity_available,
        book.condition,
        book.location || null,
        book.notes || null,
        book.added_by || null,
      ],
      function (err) {
        if (err) {
          logger.error('Error adding physical book', err);
          reject(err);
        } else {
          logger.info('Physical book added', { id: this.lastID });
          resolve(this.lastID);
        }
      }
    );
  });
};

export const getAvailableBooks = async (): Promise<PhysicalBook[]> => {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM physical_books WHERE quantity_available > 0 ORDER BY title',
      [],
      (err, rows: PhysicalBook[]) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
};

export const isBookAvailable = async (bookId: number): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT quantity_available FROM physical_books WHERE id = ?',
      [bookId],
      (err, row: { quantity_available: number }) => {
        if (err) reject(err);
        else resolve((row?.quantity_available || 0) > 0);
      }
    );
  });
};

export const createLoan = async (loan: BookLoan): Promise<number> => {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO book_loans (
        physical_book_id, user_id, request_id, due_date, issued_by, notes
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.run(
      query,
      [
        loan.physical_book_id,
        loan.user_id,
        loan.request_id || null,
        loan.due_date,
        loan.issued_by || null,
        loan.notes || null,
      ],
      function (err) {
        if (err) {
          logger.error('Error creating loan', err);
          reject(err);
        } else {
          db.run(
            'UPDATE physical_books SET quantity_available = quantity_available - 1 WHERE id = ?',
            [loan.physical_book_id],
            (updateErr) => {
              if (updateErr) {
                logger.error('Error updating availability', updateErr);
              }
              logger.info('Loan created', { id: this.lastID });
              resolve(this.lastID);
            }
          );
        }
      }
    );
  });
};

export const returnBook = async (loanId: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT physical_book_id FROM book_loans WHERE id = ?',
      [loanId],
      (err, row: { physical_book_id: number }) => {
        if (err || !row) {
          reject(err || new Error('Loan not found'));
          return;
        }

        db.run(
          'UPDATE book_loans SET status = ?, returned_at = CURRENT_TIMESTAMP WHERE id = ?',
          ['returned', loanId],
          (updateErr) => {
            if (updateErr) {
              reject(updateErr);
              return;
            }

            db.run(
              'UPDATE physical_books SET quantity_available = quantity_available + 1 WHERE id = ?',
              [row.physical_book_id],
              (incErr) => {
                if (incErr) {
                  logger.error('Error updating availability', incErr);
                }
                logger.info('Book returned', { loanId });
                resolve();
              }
            );
          }
        );
      }
    );
  });
};

export const getUserLoans = async (userId: number): Promise<BookLoan[]> => {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM book_loans WHERE user_id = ? AND status = ? ORDER BY due_date',
      [userId, 'active'],
      (err, rows: BookLoan[]) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
};

export const getOverdueLoans = async (): Promise<BookLoan[]> => {
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT * FROM book_loans WHERE status = 'active' AND due_date < datetime('now') ORDER BY due_date",
      [],
      (err, rows: BookLoan[]) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
};

const addHistory = async (
  requestId: number,
  oldStatus: string | undefined,
  newStatus: string,
  changedBy?: number,
  reason?: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO request_history (request_id, old_status, new_status, changed_by, change_reason)
      VALUES (?, ?, ?, ?, ?)
    `;

    db.run(
      query,
      [requestId, oldStatus || null, newStatus, changedBy || null, reason || null],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
};

export const getRequestHistory = async (requestId: number): Promise<RequestHistory[]> => {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM request_history WHERE request_id = ? ORDER BY changed_at DESC',
      [requestId],
      (err, rows: RequestHistory[]) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
};
