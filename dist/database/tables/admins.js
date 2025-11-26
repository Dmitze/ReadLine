"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeAdmin = exports.getExtendedAdminStats = exports.getAdminStats = exports.getAllAdmins = exports.isAdmin = exports.addAdmin = void 0;
const db_1 = require("./db");
const logger_1 = require("../../utils/logger");
const addAdmin = (userId, username) => {
    return new Promise((resolve, reject) => {
        const query = 'INSERT INTO admins (user_id, username) VALUES (?, ?)';
        db_1.db.run(query, [userId, username || null], function (err) {
            if (err) {
                logger_1.logger.error('Error adding admin', err, { userId, username });
                reject(err);
            }
            else {
                logger_1.logger.info('Admin added', { id: this.lastID, userId, username });
                resolve(this.lastID);
            }
        });
    });
};
exports.addAdmin = addAdmin;
const isAdmin = (userId) => {
    return new Promise((resolve, reject) => {
        const query = 'SELECT COUNT(*) as count FROM admins WHERE user_id = ?';
        db_1.db.get(query, [userId], (err, row) => {
            if (err) {
                logger_1.logger.error('Error checking if user is admin', err, { userId });
                reject(err);
            }
            else {
                resolve(row.count > 0);
            }
        });
    });
};
exports.isAdmin = isAdmin;
const getAllAdmins = () => {
    return new Promise((resolve, reject) => {
        const query = 'SELECT * FROM admins ORDER BY created_at DESC';
        db_1.db.all(query, [], (err, rows) => {
            if (err) {
                logger_1.logger.error('Error getting all admins', err);
                reject(err);
            }
            else {
                resolve(rows);
            }
        });
    });
};
exports.getAllAdmins = getAllAdmins;
const getAdminStats = () => {
    return new Promise((resolve, reject) => {
        const query = 'SELECT COUNT(*) as totalBooks FROM books';
        db_1.db.get(query, [], (err, row) => {
            if (err) {
                logger_1.logger.error('Error getting admin stats', err);
                reject(err);
            }
            else {
                resolve({ totalBooks: row.totalBooks });
            }
        });
    });
};
exports.getAdminStats = getAdminStats;
const getExtendedAdminStats = () => {
    return new Promise((resolve, reject) => {
        const queries = {
            totalBooks: 'SELECT COUNT(*) as count FROM books',
            totalUsers: 'SELECT COUNT(DISTINCT user_id) as count FROM saved_books',
            totalReviews: 'SELECT COUNT(*) as count FROM reviews',
            totalFeedback: 'SELECT COUNT(*) as count FROM feedback',
            totalSavedBooks: 'SELECT COUNT(*) as count FROM saved_books',
            avgRating: 'SELECT AVG(rating) as avg FROM books WHERE rating IS NOT NULL',
            pendingReviews: 'SELECT COUNT(*) as count FROM reviews WHERE is_published = 0',
            pendingFeedback: "SELECT COUNT(*) as count FROM feedback WHERE status = 'pending'",
            newUsersToday: "SELECT COUNT(DISTINCT user_id) as count FROM saved_books WHERE DATE(created_at) = DATE('now')",
            newBooksThisMonth: "SELECT COUNT(*) as count FROM books WHERE DATE(created_at) >= DATE('now', 'start of month')",
            activeUsersThisMonth: "SELECT COUNT(DISTINCT user_id) as count FROM saved_books WHERE DATE(created_at) >= DATE('now', 'start of month')",
            topGenres: 'SELECT genre, COUNT(*) as count FROM books GROUP BY genre ORDER BY count DESC LIMIT 5',
            topRatedBooks: 'SELECT title, rating, author FROM books WHERE rating IS NOT NULL ORDER BY rating DESC LIMIT 5',
        };
        const stats = {};
        db_1.db.get(queries.totalBooks, [], (err, row) => {
            if (err)
                return reject(err);
            stats.totalBooks = row.count;
            db_1.db.get(queries.totalUsers, [], (err, row) => {
                if (err)
                    return reject(err);
                stats.totalUsers = row.count;
                db_1.db.get(queries.totalReviews, [], (err, row) => {
                    if (err)
                        return reject(err);
                    stats.totalReviews = row.count;
                    db_1.db.get(queries.totalFeedback, [], (err, row) => {
                        if (err)
                            return reject(err);
                        stats.totalFeedback = row.count;
                        db_1.db.get(queries.totalSavedBooks, [], (err, row) => {
                            if (err)
                                return reject(err);
                            stats.totalSavedBooks = row.count;
                            db_1.db.get(queries.avgRating, [], (err, row) => {
                                if (err)
                                    return reject(err);
                                stats.avgRating = row.avg || 0;
                                db_1.db.get(queries.pendingReviews, [], (err, row) => {
                                    if (err)
                                        return reject(err);
                                    stats.pendingReviews = row.count;
                                    db_1.db.get(queries.pendingFeedback, [], (err, row) => {
                                        if (err)
                                            return reject(err);
                                        stats.pendingFeedback = row.count;
                                        db_1.db.get(queries.newUsersToday, [], (err, row) => {
                                            if (err)
                                                return reject(err);
                                            stats.newUsersToday = row.count;
                                            db_1.db.get(queries.newBooksThisMonth, [], (err, row) => {
                                                if (err)
                                                    return reject(err);
                                                stats.newBooksThisMonth = row.count;
                                                db_1.db.get(queries.activeUsersThisMonth, [], (err, row) => {
                                                    if (err)
                                                        return reject(err);
                                                    stats.activeUsersThisMonth = row.count;
                                                    db_1.db.all(queries.topGenres, [], (err, rows) => {
                                                        if (err)
                                                            return reject(err);
                                                        stats.topGenres = rows;
                                                        db_1.db.all(queries.topRatedBooks, [], (err, rows) => {
                                                            if (err)
                                                                return reject(err);
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
exports.getExtendedAdminStats = getExtendedAdminStats;
const removeAdmin = (userId) => {
    return new Promise((resolve, reject) => {
        const query = 'DELETE FROM admins WHERE user_id = ?';
        db_1.db.run(query, [userId], function (err) {
            if (err) {
                logger_1.logger.error('Error removing admin', err, { userId });
                reject(err);
            }
            else {
                logger_1.logger.info('Admin removed', { userId, changes: this.changes });
                resolve(this.changes);
            }
        });
    });
};
exports.removeAdmin = removeAdmin;
//# sourceMappingURL=admins.js.map