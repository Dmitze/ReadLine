"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFeedback = exports.addAdminReply = exports.updateFeedbackStatus = exports.getAllFeedbackMessages = exports.getPendingFeedbackMessages = exports.addFeedbackMessage = void 0;
const db_1 = require("./db");
const logger_1 = require("../../utils/logger");
const addFeedbackMessage = (feedbackData) => {
    return new Promise((resolve, reject) => {
        const { user_id, message } = feedbackData;
        const query = 'INSERT INTO feedback (user_id, message, status) VALUES (?, ?, "pending")';
        db_1.db.run(query, [user_id, message], function (err) {
            if (err) {
                logger_1.logger.error('Error adding feedback', err, { user_id });
                reject(err);
            }
            else {
                logger_1.logger.info('Feedback added', { id: this.lastID, user_id });
                resolve(this.lastID);
            }
        });
    });
};
exports.addFeedbackMessage = addFeedbackMessage;
const getPendingFeedbackMessages = () => {
    return new Promise((resolve, reject) => {
        const query = `
      SELECT * FROM feedback 
      WHERE status = 'pending' 
      ORDER BY created_at ASC
    `;
        db_1.db.all(query, [], (err, rows) => {
            if (err) {
                logger_1.logger.error('Error getting pending feedback', err);
                reject(err);
            }
            else {
                resolve(rows);
            }
        });
    });
};
exports.getPendingFeedbackMessages = getPendingFeedbackMessages;
const getAllFeedbackMessages = () => {
    return new Promise((resolve, reject) => {
        const query = 'SELECT * FROM feedback ORDER BY created_at DESC';
        db_1.db.all(query, [], (err, rows) => {
            if (err) {
                logger_1.logger.error('Error getting all feedback', err);
                reject(err);
            }
            else {
                resolve(rows);
            }
        });
    });
};
exports.getAllFeedbackMessages = getAllFeedbackMessages;
const updateFeedbackStatus = (feedbackId, status) => {
    return new Promise((resolve, reject) => {
        const query = 'UPDATE feedback SET status = ? WHERE id = ?';
        db_1.db.run(query, [status, feedbackId], function (err) {
            if (err) {
                logger_1.logger.error('Error updating feedback status', err, { feedbackId, status });
                reject(err);
            }
            else {
                logger_1.logger.info('Feedback status updated', { feedbackId, status, changes: this.changes });
                resolve(this.changes);
            }
        });
    });
};
exports.updateFeedbackStatus = updateFeedbackStatus;
const addAdminReply = (feedbackId, reply) => {
    return new Promise((resolve, reject) => {
        const query = `
      UPDATE feedback 
      SET admin_reply = ?, status = 'replied', read_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
        db_1.db.run(query, [reply, feedbackId], (err) => {
            if (err) {
                logger_1.logger.error('Error adding admin reply', err, { feedbackId });
                reject(err);
            }
            else {
                logger_1.logger.info('Admin reply added', { feedbackId });
                resolve();
            }
        });
    });
};
exports.addAdminReply = addAdminReply;
const deleteFeedback = (feedbackId) => {
    return new Promise((resolve, reject) => {
        const query = 'DELETE FROM feedback WHERE id = ?';
        db_1.db.run(query, [feedbackId], function (err) {
            if (err) {
                logger_1.logger.error('Error deleting feedback', err, { feedbackId });
                reject(err);
            }
            else {
                logger_1.logger.info('Feedback deleted', { feedbackId, changes: this.changes });
                resolve(this.changes);
            }
        });
    });
};
exports.deleteFeedback = deleteFeedback;
//# sourceMappingURL=feedback.js.map