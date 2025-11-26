"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRequestHistory = exports.getOverdueLoans = exports.getUserLoans = exports.returnBook = exports.createLoan = exports.isBookAvailable = exports.getAvailableBooks = exports.addPhysicalBook = exports.countRequests = exports.cancelRequest = exports.updateRequestStatus = exports.getRequestsByStatus = exports.getUserRequests = exports.getRequestById = exports.createRequest = exports.initPhysicalBooksSystem = void 0;
const db_1 = require("./db");
const logger_1 = require("../../utils/logger");
const initPhysicalBooksSystem = async () => {
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
        db_1.db.exec(sql, (err) => {
            if (err) {
                logger_1.logger.error('Error initializing physical books system', err);
                reject(err);
            }
            else {
                logger_1.logger.info('Physical books system initialized successfully');
                resolve();
            }
        });
    });
};
exports.initPhysicalBooksSystem = initPhysicalBooksSystem;
const createRequest = async (request) => {
    return new Promise((resolve, reject) => {
        const query = `
      INSERT INTO physical_book_requests (
        user_id, book_title, book_author, book_genre, 
        book_description, book_cover_url, notes, priority
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
        db_1.db.run(query, [
            request.user_id,
            request.book_title,
            request.book_author,
            request.book_genre || null,
            request.book_description || null,
            request.book_cover_url || null,
            request.notes || null,
            request.priority || 0,
        ], function (err) {
            if (err) {
                logger_1.logger.error('Error creating request', err);
                reject(err);
            }
            else {
                logger_1.logger.info('Request created', { id: this.lastID, user_id: request.user_id });
                resolve(this.lastID);
            }
        });
    });
};
exports.createRequest = createRequest;
const getRequestById = async (id) => {
    return new Promise((resolve, reject) => {
        db_1.db.get('SELECT * FROM physical_book_requests WHERE id = ?', [id], (err, row) => {
            if (err)
                reject(err);
            else
                resolve(row);
        });
    });
};
exports.getRequestById = getRequestById;
const getUserRequests = async (userId) => {
    return new Promise((resolve, reject) => {
        db_1.db.all('SELECT * FROM physical_book_requests WHERE user_id = ? ORDER BY requested_at DESC', [userId], (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows || []);
        });
    });
};
exports.getUserRequests = getUserRequests;
const getRequestsByStatus = async (status) => {
    return new Promise((resolve, reject) => {
        db_1.db.all('SELECT * FROM physical_book_requests WHERE status = ? ORDER BY priority DESC, requested_at ASC', [status], (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows || []);
        });
    });
};
exports.getRequestsByStatus = getRequestsByStatus;
const updateRequestStatus = async (requestId, newStatus, adminId, reason) => {
    return new Promise((resolve, reject) => {
        db_1.db.get('SELECT status FROM physical_book_requests WHERE id = ?', [requestId], (err, row) => {
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
            db_1.db.run(updateQuery, [newStatus, adminId || null, reason || null, newStatus, requestId], (updateErr) => {
                if (updateErr) {
                    logger_1.logger.error('Error updating request status', updateErr);
                    reject(updateErr);
                    return;
                }
                addHistory(requestId, oldStatus, newStatus, adminId, reason)
                    .then(() => {
                    logger_1.logger.info('Request status updated', { requestId, oldStatus, newStatus });
                    resolve();
                })
                    .catch((historyErr) => {
                    logger_1.logger.error('Error adding history', historyErr);
                    resolve();
                });
            });
        });
    });
};
exports.updateRequestStatus = updateRequestStatus;
const cancelRequest = async (requestId, userId) => {
    return new Promise((resolve, reject) => {
        db_1.db.run('UPDATE physical_book_requests SET status = ? WHERE id = ? AND user_id = ? AND status = ?', ['cancelled', requestId, userId, 'pending'], function (err) {
            if (err)
                reject(err);
            else
                resolve(this.changes > 0);
        });
    });
};
exports.cancelRequest = cancelRequest;
const countRequests = async (status) => {
    return new Promise((resolve, reject) => {
        db_1.db.get('SELECT COUNT(*) as count FROM physical_book_requests WHERE status = ?', [status], (err, row) => {
            if (err)
                reject(err);
            else
                resolve(row?.count || 0);
        });
    });
};
exports.countRequests = countRequests;
const addPhysicalBook = async (book) => {
    return new Promise((resolve, reject) => {
        const query = `
      INSERT INTO physical_books (
        book_id, title, author, isbn, quantity_total, 
        quantity_available, condition, location, notes, added_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
        db_1.db.run(query, [
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
        ], function (err) {
            if (err) {
                logger_1.logger.error('Error adding physical book', err);
                reject(err);
            }
            else {
                logger_1.logger.info('Physical book added', { id: this.lastID });
                resolve(this.lastID);
            }
        });
    });
};
exports.addPhysicalBook = addPhysicalBook;
const getAvailableBooks = async () => {
    return new Promise((resolve, reject) => {
        db_1.db.all('SELECT * FROM physical_books WHERE quantity_available > 0 ORDER BY title', [], (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows || []);
        });
    });
};
exports.getAvailableBooks = getAvailableBooks;
const isBookAvailable = async (bookId) => {
    return new Promise((resolve, reject) => {
        db_1.db.get('SELECT quantity_available FROM physical_books WHERE id = ?', [bookId], (err, row) => {
            if (err)
                reject(err);
            else
                resolve((row?.quantity_available || 0) > 0);
        });
    });
};
exports.isBookAvailable = isBookAvailable;
const createLoan = async (loan) => {
    return new Promise((resolve, reject) => {
        const query = `
      INSERT INTO book_loans (
        physical_book_id, user_id, request_id, due_date, issued_by, notes
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;
        db_1.db.run(query, [
            loan.physical_book_id,
            loan.user_id,
            loan.request_id || null,
            loan.due_date,
            loan.issued_by || null,
            loan.notes || null,
        ], function (err) {
            if (err) {
                logger_1.logger.error('Error creating loan', err);
                reject(err);
            }
            else {
                db_1.db.run('UPDATE physical_books SET quantity_available = quantity_available - 1 WHERE id = ?', [loan.physical_book_id], (updateErr) => {
                    if (updateErr) {
                        logger_1.logger.error('Error updating availability', updateErr);
                    }
                    logger_1.logger.info('Loan created', { id: this.lastID });
                    resolve(this.lastID);
                });
            }
        });
    });
};
exports.createLoan = createLoan;
const returnBook = async (loanId) => {
    return new Promise((resolve, reject) => {
        db_1.db.get('SELECT physical_book_id FROM book_loans WHERE id = ?', [loanId], (err, row) => {
            if (err || !row) {
                reject(err || new Error('Loan not found'));
                return;
            }
            db_1.db.run('UPDATE book_loans SET status = ?, returned_at = CURRENT_TIMESTAMP WHERE id = ?', ['returned', loanId], (updateErr) => {
                if (updateErr) {
                    reject(updateErr);
                    return;
                }
                db_1.db.run('UPDATE physical_books SET quantity_available = quantity_available + 1 WHERE id = ?', [row.physical_book_id], (incErr) => {
                    if (incErr) {
                        logger_1.logger.error('Error updating availability', incErr);
                    }
                    logger_1.logger.info('Book returned', { loanId });
                    resolve();
                });
            });
        });
    });
};
exports.returnBook = returnBook;
const getUserLoans = async (userId) => {
    return new Promise((resolve, reject) => {
        db_1.db.all('SELECT * FROM book_loans WHERE user_id = ? AND status = ? ORDER BY due_date', [userId, 'active'], (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows || []);
        });
    });
};
exports.getUserLoans = getUserLoans;
const getOverdueLoans = async () => {
    return new Promise((resolve, reject) => {
        db_1.db.all("SELECT * FROM book_loans WHERE status = 'active' AND due_date < datetime('now') ORDER BY due_date", [], (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows || []);
        });
    });
};
exports.getOverdueLoans = getOverdueLoans;
const addHistory = async (requestId, oldStatus, newStatus, changedBy, reason) => {
    return new Promise((resolve, reject) => {
        const query = `
      INSERT INTO request_history (request_id, old_status, new_status, changed_by, change_reason)
      VALUES (?, ?, ?, ?, ?)
    `;
        db_1.db.run(query, [requestId, oldStatus || null, newStatus, changedBy || null, reason || null], (err) => {
            if (err)
                reject(err);
            else
                resolve();
        });
    });
};
const getRequestHistory = async (requestId) => {
    return new Promise((resolve, reject) => {
        db_1.db.all('SELECT * FROM request_history WHERE request_id = ? ORDER BY changed_at DESC', [requestId], (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows || []);
        });
    });
};
exports.getRequestHistory = getRequestHistory;
//# sourceMappingURL=physicalBooks.js.map