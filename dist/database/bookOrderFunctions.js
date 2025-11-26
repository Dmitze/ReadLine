"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserOrdersCount = exports.hasUserOrderedBook = exports.deleteBookOrder = exports.getAllBookOrders = exports.getUserBookOrders = exports.getBookOrderWithBookInfo = exports.getBookOrderById = exports.createBookOrder = void 0;
const models_1 = require("./models");
const logger_1 = require("../utils/logger");
const helpers_1 = require("../utils/helpers");
const createBookOrder = (order) => {
    return new Promise((resolve, reject) => {
        const query = `
      INSERT INTO book_orders (book_id, user_id, full_name, callsign, unit, phone)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
        models_1.db.run(query, [order.book_id, order.user_id, order.full_name, order.callsign, order.unit, order.phone], function (err) {
            if (err) {
                logger_1.logger.error('Error creating book order', err);
                reject(err);
            }
            else {
                logger_1.logger.info('Book order created', { orderId: this.lastID, userId: order.user_id });
                resolve(this.lastID);
            }
        });
    });
};
exports.createBookOrder = createBookOrder;
const getBookOrderById = (orderId) => {
    return new Promise((resolve, reject) => {
        const safeOrderId = (0, helpers_1.safeParseInt)(orderId, 0);
        if (safeOrderId <= 0) {
            reject(new Error('Invalid order ID'));
            return;
        }
        const query = 'SELECT * FROM book_orders WHERE id = ?';
        models_1.db.get(query, [safeOrderId], (err, row) => {
            if (err) {
                logger_1.logger.error('Error getting book order', err);
                reject(err);
            }
            else {
                resolve(row);
            }
        });
    });
};
exports.getBookOrderById = getBookOrderById;
const getBookOrderWithBookInfo = (orderId) => {
    return new Promise((resolve, reject) => {
        const safeOrderId = (0, helpers_1.safeParseInt)(orderId, 0);
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
        models_1.db.get(query, [safeOrderId], (err, row) => {
            if (err) {
                logger_1.logger.error('Error getting book order with info', err);
                reject(err);
            }
            else {
                resolve(row);
            }
        });
    });
};
exports.getBookOrderWithBookInfo = getBookOrderWithBookInfo;
const getUserBookOrders = (userId) => {
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
        models_1.db.all(query, [userId], (err, rows) => {
            if (err) {
                logger_1.logger.error('Error getting user book orders', err);
                reject(err);
            }
            else {
                resolve(rows || []);
            }
        });
    });
};
exports.getUserBookOrders = getUserBookOrders;
const getAllBookOrders = () => {
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
        models_1.db.all(query, [], (err, rows) => {
            if (err) {
                logger_1.logger.error('Error getting all book orders', err);
                reject(err);
            }
            else {
                resolve(rows || []);
            }
        });
    });
};
exports.getAllBookOrders = getAllBookOrders;
const deleteBookOrder = (orderId) => {
    return new Promise((resolve, reject) => {
        const safeOrderId = (0, helpers_1.safeParseInt)(orderId, 0);
        if (safeOrderId <= 0) {
            reject(new Error('Invalid order ID'));
            return;
        }
        const query = 'DELETE FROM book_orders WHERE id = ?';
        models_1.db.run(query, [safeOrderId], (err) => {
            if (err) {
                logger_1.logger.error('Error deleting book order', err);
                reject(err);
            }
            else {
                logger_1.logger.info('Book order deleted', { orderId: safeOrderId });
                resolve();
            }
        });
    });
};
exports.deleteBookOrder = deleteBookOrder;
const hasUserOrderedBook = (userId, bookId) => {
    return new Promise((resolve, reject) => {
        const safeUserId = (0, helpers_1.safeParseInt)(userId, 0);
        const safeBookId = (0, helpers_1.safeParseInt)(bookId, 0);
        if (safeUserId <= 0 || safeBookId <= 0) {
            reject(new Error('Invalid user ID or book ID'));
            return;
        }
        const query = 'SELECT COUNT(*) as count FROM book_orders WHERE user_id = ? AND book_id = ?';
        models_1.db.get(query, [safeUserId, safeBookId], (err, row) => {
            if (err) {
                logger_1.logger.error('Error checking user book order', err);
                reject(err);
            }
            else {
                resolve(row?.count > 0);
            }
        });
    });
};
exports.hasUserOrderedBook = hasUserOrderedBook;
const getUserOrdersCount = (userId) => {
    return new Promise((resolve, reject) => {
        const safeUserId = (0, helpers_1.safeParseInt)(userId, 0);
        if (safeUserId <= 0) {
            reject(new Error('Invalid user ID'));
            return;
        }
        const query = 'SELECT COUNT(*) as count FROM book_orders WHERE user_id = ?';
        models_1.db.get(query, [safeUserId], (err, row) => {
            if (err) {
                logger_1.logger.error('Error getting user orders count', err);
                reject(err);
            }
            else {
                resolve(row?.count || 0);
            }
        });
    });
};
exports.getUserOrdersCount = getUserOrdersCount;
//# sourceMappingURL=bookOrderFunctions.js.map