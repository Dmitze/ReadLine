"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBookRequest = exports.markOverdueRequests = exports.getOverdueRequests = exports.getBookRequestsStats = exports.returnBook = exports.issueBook = exports.updateBookRequestStatus = exports.getAllBookRequests = exports.getBookRequestsByStatus = exports.getUserBookRequests = exports.getBookRequestById = exports.createBookRequest = exports.createBookRequestsTable = exports.BookRequestPriority = exports.BookRequestStatus = void 0;
const db_1 = require("./db");
const logger_1 = require("../../utils/logger");
var BookRequestStatus;
(function (BookRequestStatus) {
    BookRequestStatus["PENDING"] = "pending";
    BookRequestStatus["APPROVED"] = "approved";
    BookRequestStatus["REJECTED"] = "rejected";
    BookRequestStatus["ISSUED"] = "issued";
    BookRequestStatus["RETURNED"] = "returned";
    BookRequestStatus["OVERDUE"] = "overdue";
})(BookRequestStatus || (exports.BookRequestStatus = BookRequestStatus = {}));
var BookRequestPriority;
(function (BookRequestPriority) {
    BookRequestPriority["LOW"] = "low";
    BookRequestPriority["MEDIUM"] = "medium";
    BookRequestPriority["HIGH"] = "high";
    BookRequestPriority["URGENT"] = "urgent";
})(BookRequestPriority || (exports.BookRequestPriority = BookRequestPriority = {}));
const createBookRequestsTable = () => {
    return new Promise((resolve, reject) => {
        db_1.db.exec(`
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
      `, (err) => {
            if (err) {
                logger_1.logger.error('Error creating book_requests table', err);
                reject(err);
            }
            else {
                logger_1.logger.info('Book requests table created successfully');
                resolve();
            }
        });
    });
};
exports.createBookRequestsTable = createBookRequestsTable;
const createBookRequest = (request) => {
    return new Promise((resolve, reject) => {
        const query = `
      INSERT INTO book_requests (
        user_id, book_title, book_author, book_genre, status, priority, comment
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
        db_1.db.run(query, [
            request.user_id,
            request.book_title,
            request.book_author,
            request.book_genre || null,
            request.status || BookRequestStatus.PENDING,
            request.priority || BookRequestPriority.MEDIUM,
            request.comment || null,
        ], function (err) {
            if (err) {
                logger_1.logger.error('Error creating book request', err, request);
                reject(err);
            }
            else {
                logger_1.logger.info('Book request created', { id: this.lastID, user_id: request.user_id });
                resolve(this.lastID);
            }
        });
    });
};
exports.createBookRequest = createBookRequest;
const getBookRequestById = (requestId) => {
    return new Promise((resolve, reject) => {
        db_1.db.get('SELECT * FROM book_requests WHERE id = ?', [requestId], (err, row) => {
            if (err)
                reject(err);
            else
                resolve(row);
        });
    });
};
exports.getBookRequestById = getBookRequestById;
const getUserBookRequests = (userId) => {
    return new Promise((resolve, reject) => {
        db_1.db.all('SELECT * FROM book_requests WHERE user_id = ? ORDER BY created_at DESC', [userId], (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows || []);
        });
    });
};
exports.getUserBookRequests = getUserBookRequests;
const getBookRequestsByStatus = (status) => {
    return new Promise((resolve, reject) => {
        db_1.db.all('SELECT * FROM book_requests WHERE status = ? ORDER BY priority DESC, created_at ASC', [status], (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows || []);
        });
    });
};
exports.getBookRequestsByStatus = getBookRequestsByStatus;
const getAllBookRequests = (limit) => {
    return new Promise((resolve, reject) => {
        const query = limit
            ? 'SELECT * FROM book_requests ORDER BY created_at DESC LIMIT ?'
            : 'SELECT * FROM book_requests ORDER BY created_at DESC';
        const params = limit ? [limit] : [];
        db_1.db.all(query, params, (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows || []);
        });
    });
};
exports.getAllBookRequests = getAllBookRequests;
const updateBookRequestStatus = (requestId, status, adminId, adminComment) => {
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
        db_1.db.run(query, [status, adminId || null, adminComment || null, requestId], function (err) {
            if (err) {
                logger_1.logger.error('Error updating book request status', err, { requestId, status });
                reject(err);
            }
            else {
                logger_1.logger.info('Book request status updated', { requestId, status, changes: this.changes });
                resolve();
            }
        });
    });
};
exports.updateBookRequestStatus = updateBookRequestStatus;
const issueBook = (requestId, daysToReturn, adminId) => {
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
        db_1.db.run(query, [BookRequestStatus.ISSUED, daysToReturn, adminId, requestId], function (err) {
            if (err) {
                logger_1.logger.error('Error issuing book', err, { requestId });
                reject(err);
            }
            else {
                logger_1.logger.info('Book issued', { requestId, daysToReturn, changes: this.changes });
                resolve();
            }
        });
    });
};
exports.issueBook = issueBook;
const returnBook = (requestId) => {
    return new Promise((resolve, reject) => {
        const query = `
      UPDATE book_requests 
      SET status = ?, 
          returned_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
        db_1.db.run(query, [BookRequestStatus.RETURNED, requestId], function (err) {
            if (err) {
                logger_1.logger.error('Error returning book', err, { requestId });
                reject(err);
            }
            else {
                logger_1.logger.info('Book returned', { requestId, changes: this.changes });
                resolve();
            }
        });
    });
};
exports.returnBook = returnBook;
const getBookRequestsStats = () => {
    return new Promise((resolve, reject) => {
        db_1.db.get(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN status = 'issued' THEN 1 ELSE 0 END) as issued,
        SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END) as returned,
        SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) as overdue
      FROM book_requests
      `, [], (err, row) => {
            if (err)
                reject(err);
            else
                resolve(row || { total: 0, pending: 0, approved: 0, rejected: 0, issued: 0, returned: 0, overdue: 0 });
        });
    });
};
exports.getBookRequestsStats = getBookRequestsStats;
const getOverdueRequests = () => {
    return new Promise((resolve, reject) => {
        db_1.db.all(`SELECT * FROM book_requests 
       WHERE status = 'issued' 
       AND due_date < datetime('now')
       ORDER BY due_date ASC`, [], (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows || []);
        });
    });
};
exports.getOverdueRequests = getOverdueRequests;
const markOverdueRequests = () => {
    return new Promise((resolve, reject) => {
        db_1.db.run(`UPDATE book_requests 
       SET status = 'overdue', updated_at = CURRENT_TIMESTAMP
       WHERE status = 'issued' 
       AND due_date < datetime('now')`, [], function (err) {
            if (err) {
                logger_1.logger.error('Error marking overdue requests', err);
                reject(err);
            }
            else {
                logger_1.logger.info('Marked overdue requests', { count: this.changes });
                resolve(this.changes);
            }
        });
    });
};
exports.markOverdueRequests = markOverdueRequests;
const deleteBookRequest = (requestId) => {
    return new Promise((resolve, reject) => {
        db_1.db.run('DELETE FROM book_requests WHERE id = ?', [requestId], function (err) {
            if (err) {
                logger_1.logger.error('Error deleting book request', err, { requestId });
                reject(err);
            }
            else {
                logger_1.logger.info('Book request deleted', { requestId, changes: this.changes });
                resolve();
            }
        });
    });
};
exports.deleteBookRequest = deleteBookRequest;
//# sourceMappingURL=bookRequests.js.map