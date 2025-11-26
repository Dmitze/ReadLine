"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBookRating = exports.publishReview = exports.deleteReview = exports.approveReview = exports.getPendingReviews = exports.getBookReviews = exports.addReview = void 0;
const db_1 = require("./db");
const logger_1 = require("../../utils/logger");
const addReview = (reviewData) => {
    return new Promise((resolve, reject) => {
        const { book_id, user_id, user_name, rating, comment, is_published = false } = reviewData;
        const query = `
      INSERT INTO reviews (book_id, user_id, user_name, rating, comment, is_published)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
        db_1.db.run(query, [book_id, user_id, user_name || null, rating, comment || null, is_published ? 1 : 0], function (err) {
            if (err) {
                logger_1.logger.error('Error adding review', err, { book_id, user_id, rating });
                reject(err);
            }
            else {
                logger_1.logger.info('Review added successfully', { id: this.lastID, book_id, user_id });
                resolve(this.lastID);
            }
        });
    });
};
exports.addReview = addReview;
const getBookReviews = (bookId) => {
    return new Promise((resolve, reject) => {
        const query = `
      SELECT * FROM reviews 
      WHERE book_id = ? AND is_published = 1 
      ORDER BY created_at DESC
    `;
        db_1.db.all(query, [bookId], (err, rows) => {
            if (err) {
                logger_1.logger.error('Error getting book reviews', err, { bookId });
                reject(err);
            }
            else {
                resolve(rows);
            }
        });
    });
};
exports.getBookReviews = getBookReviews;
const getPendingReviews = () => {
    return new Promise((resolve, reject) => {
        const query = `
      SELECT r.*, b.title as book_title, b.author as book_author
      FROM reviews r
      LEFT JOIN books b ON r.book_id = b.id
      WHERE r.is_published = 0
      ORDER BY r.created_at ASC
    `;
        db_1.db.all(query, [], (err, rows) => {
            if (err) {
                logger_1.logger.error('Error getting pending reviews', err);
                reject(err);
            }
            else {
                resolve(rows);
            }
        });
    });
};
exports.getPendingReviews = getPendingReviews;
const approveReview = (reviewId) => {
    return new Promise((resolve, reject) => {
        const query = 'UPDATE reviews SET is_published = 1 WHERE id = ?';
        db_1.db.run(query, [reviewId], function (err) {
            if (err) {
                logger_1.logger.error('Error approving review', err, { reviewId });
                reject(err);
            }
            else {
                logger_1.logger.info('Review approved', { reviewId, changes: this.changes });
                resolve(this.changes);
            }
        });
    });
};
exports.approveReview = approveReview;
const deleteReview = (reviewId) => {
    return new Promise((resolve, reject) => {
        const query = 'DELETE FROM reviews WHERE id = ?';
        db_1.db.run(query, [reviewId], function (err) {
            if (err) {
                logger_1.logger.error('Error deleting review', err, { reviewId });
                reject(err);
            }
            else {
                logger_1.logger.info('Review deleted', { reviewId, changes: this.changes });
                resolve(this.changes);
            }
        });
    });
};
exports.deleteReview = deleteReview;
const publishReview = (reviewId) => {
    return (0, exports.approveReview)(reviewId);
};
exports.publishReview = publishReview;
const updateBookRating = (bookId) => {
    return new Promise((resolve, reject) => {
        const query = `
      UPDATE books
      SET 
        rating = (
          SELECT AVG(rating) 
          FROM reviews 
          WHERE book_id = ? AND is_published = 1
        ),
        reviews_count = (
          SELECT COUNT(*) 
          FROM reviews 
          WHERE book_id = ? AND is_published = 1
        )
      WHERE id = ?
    `;
        db_1.db.run(query, [bookId, bookId, bookId], (err) => {
            if (err) {
                logger_1.logger.error('Error updating book rating', err, { bookId });
                reject(err);
            }
            else {
                logger_1.logger.info('Book rating updated', { bookId });
                resolve();
            }
        });
    });
};
exports.updateBookRating = updateBookRating;
//# sourceMappingURL=reviews.js.map