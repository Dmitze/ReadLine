import { db } from './db';
import { FeedbackMessage } from './types';
import { logger } from '../../utils/logger';

export const addFeedbackMessage = (
  feedbackData: Omit<FeedbackMessage, 'id' | 'status' | 'created_at' | 'read_at'>
): Promise<number> => {
  return new Promise((resolve, reject) => {
    const { user_id, message } = feedbackData;
    const query = 'INSERT INTO feedback (user_id, message, status) VALUES (?, ?, "pending")';

    db.run(query, [user_id, message], function (err) {
      if (err) {
        logger.error('Error adding feedback', err, { user_id });
        reject(err);
      } else {
        logger.info('Feedback added', { id: this.lastID, user_id });
        resolve(this.lastID);
      }
    });
  });
};

export const getPendingFeedbackMessages = (): Promise<FeedbackMessage[]> => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT * FROM feedback 
      WHERE status = 'pending' 
      ORDER BY created_at ASC
    `;

    db.all(query, [], (err, rows: FeedbackMessage[]) => {
      if (err) {
        logger.error('Error getting pending feedback', err);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

export const getAllFeedbackMessages = (): Promise<FeedbackMessage[]> => {
  return new Promise((resolve, reject) => {
    const query = 'SELECT * FROM feedback ORDER BY created_at DESC';

    db.all(query, [], (err, rows: FeedbackMessage[]) => {
      if (err) {
        logger.error('Error getting all feedback', err);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

export const updateFeedbackStatus = (feedbackId: number, status: string): Promise<number> => {
  return new Promise((resolve, reject) => {
    const query = 'UPDATE feedback SET status = ? WHERE id = ?';

    db.run(query, [status, feedbackId], function (err) {
      if (err) {
        logger.error('Error updating feedback status', err, { feedbackId, status });
        reject(err);
      } else {
        logger.info('Feedback status updated', { feedbackId, status, changes: this.changes });
        resolve(this.changes);
      }
    });
  });
};

export const addAdminReply = (feedbackId: number, reply: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE feedback 
      SET admin_reply = ?, status = 'replied', read_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;

    db.run(query, [reply, feedbackId], (err) => {
      if (err) {
        logger.error('Error adding admin reply', err, { feedbackId });
        reject(err);
      } else {
        logger.info('Admin reply added', { feedbackId });
        resolve();
      }
    });
  });
};

export const deleteFeedback = (feedbackId: number): Promise<number> => {
  return new Promise((resolve, reject) => {
    const query = 'DELETE FROM feedback WHERE id = ?';

    db.run(query, [feedbackId], function (err) {
      if (err) {
        logger.error('Error deleting feedback', err, { feedbackId });
        reject(err);
      } else {
        logger.info('Feedback deleted', { feedbackId, changes: this.changes });
        resolve(this.changes);
      }
    });
  });
};
