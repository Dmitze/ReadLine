"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePodcast = exports.deletePodcast = exports.getPodcastReviews = exports.addPodcastReview = exports.incrementPodcastListens = exports.getPodcastById = exports.getAllPodcastsWithPagination = exports.getAllPodcasts = exports.addPodcast = void 0;
const db_1 = require("./db");
const logger_1 = require("../../utils/logger");
const addPodcast = (podcast) => {
    return new Promise((resolve, reject) => {
        const query = `
      INSERT INTO podcasts (
        theme, description, file_type, file_url, file_id, file_name, 
        file_size, duration, cover_photo_id, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
        db_1.db.run(query, [
            podcast.theme,
            podcast.description,
            podcast.file_type,
            podcast.file_url || null,
            podcast.file_id || null,
            podcast.file_name || null,
            podcast.file_size || null,
            podcast.duration || null,
            podcast.cover_photo_id || null,
            podcast.created_by || null,
        ], function (err) {
            if (err) {
                logger_1.logger.error('Error adding podcast', err, { theme: podcast.theme });
                reject(err);
            }
            else {
                logger_1.logger.info('Podcast added', { id: this.lastID, theme: podcast.theme });
                resolve(this.lastID);
            }
        });
    });
};
exports.addPodcast = addPodcast;
const getAllPodcasts = () => {
    return new Promise((resolve, reject) => {
        db_1.db.all('SELECT * FROM podcasts WHERE is_available = 1 ORDER BY created_at DESC', [], (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows || []);
        });
    });
};
exports.getAllPodcasts = getAllPodcasts;
const getAllPodcastsWithPagination = (limit = 10, offset = 0) => {
    return new Promise((resolve, reject) => {
        db_1.db.get('SELECT COUNT(*) as total FROM podcasts WHERE is_available = 1', [], (err, countRow) => {
            if (err) {
                reject(err);
                return;
            }
            db_1.db.all('SELECT * FROM podcasts WHERE is_available = 1 ORDER BY created_at DESC LIMIT ? OFFSET ?', [limit, offset], (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve({ podcasts: rows || [], total: countRow?.total || 0 });
            });
        });
    });
};
exports.getAllPodcastsWithPagination = getAllPodcastsWithPagination;
const getPodcastById = (podcastId) => {
    return new Promise((resolve, reject) => {
        db_1.db.get('SELECT * FROM podcasts WHERE id = ?', [podcastId], (err, row) => {
            if (err)
                reject(err);
            else
                resolve(row);
        });
    });
};
exports.getPodcastById = getPodcastById;
const incrementPodcastListens = (podcastId, userId) => {
    return new Promise((resolve, reject) => {
        db_1.db.run('INSERT INTO podcast_listens (podcast_id, user_id) VALUES (?, ?)', [podcastId, userId], (err) => {
            if (err) {
                logger_1.logger.error('Error adding podcast listen', err, { podcastId, userId });
                reject(err);
                return;
            }
            db_1.db.run('UPDATE podcasts SET listens_count = listens_count + 1 WHERE id = ?', [podcastId], (updateErr) => {
                if (updateErr) {
                    logger_1.logger.error('Error updating listens count', updateErr, { podcastId });
                    reject(updateErr);
                }
                else {
                    logger_1.logger.info('Podcast listen incremented', { podcastId, userId });
                    resolve();
                }
            });
        });
    });
};
exports.incrementPodcastListens = incrementPodcastListens;
const addPodcastReview = (review) => {
    return new Promise((resolve, reject) => {
        db_1.db.run('INSERT INTO podcast_reviews (podcast_id, user_id, rating, comment) VALUES (?, ?, ?, ?)', [review.podcast_id, review.user_id, review.rating, review.comment || null], function (err) {
            if (err) {
                logger_1.logger.error('Error adding podcast review', err, {
                    podcast_id: review.podcast_id,
                    user_id: review.user_id,
                });
                reject(err);
            }
            else {
                logger_1.logger.info('Podcast review added', { id: this.lastID, podcast_id: review.podcast_id });
                updatePodcastRating(review.podcast_id).catch((updateErr) => {
                    logger_1.logger.error('Error updating podcast rating', updateErr, {
                        podcast_id: review.podcast_id,
                    });
                });
                resolve(this.lastID);
            }
        });
    });
};
exports.addPodcastReview = addPodcastReview;
const updatePodcastRating = (podcastId) => {
    return new Promise((resolve, reject) => {
        db_1.db.get('SELECT AVG(rating) as avg_rating FROM podcast_reviews WHERE podcast_id = ? AND is_published = 1', [podcastId], (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            const avgRating = row?.avg_rating || 0;
            db_1.db.run('UPDATE podcasts SET rating = ? WHERE id = ?', [avgRating, podcastId], (updateErr) => {
                if (updateErr)
                    reject(updateErr);
                else
                    resolve();
            });
        });
    });
};
const getPodcastReviews = (podcastId) => {
    return new Promise((resolve, reject) => {
        db_1.db.all('SELECT * FROM podcast_reviews WHERE podcast_id = ? AND is_published = 1 ORDER BY created_at DESC', [podcastId], (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows || []);
        });
    });
};
exports.getPodcastReviews = getPodcastReviews;
const deletePodcast = (podcastId) => {
    return new Promise((resolve, reject) => {
        db_1.db.run('DELETE FROM podcasts WHERE id = ?', [podcastId], function (err) {
            if (err) {
                logger_1.logger.error('Error deleting podcast', err, { podcastId });
                reject(err);
            }
            else {
                logger_1.logger.info('Podcast deleted', { podcastId, changes: this.changes });
                resolve();
            }
        });
    });
};
exports.deletePodcast = deletePodcast;
const updatePodcast = (podcastId, updates) => {
    return new Promise((resolve, reject) => {
        const fields = Object.keys(updates).filter((key) => key !== 'id');
        const setClause = fields.map((field) => `${field} = ?`).join(', ');
        const values = fields.map((field) => updates[field]);
        if (fields.length === 0) {
            resolve();
            return;
        }
        const query = `UPDATE podcasts SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
        db_1.db.run(query, [...values, podcastId], function (err) {
            if (err) {
                logger_1.logger.error('Error updating podcast', err, { podcastId, updates });
                reject(err);
            }
            else {
                logger_1.logger.info('Podcast updated successfully', { podcastId, changes: this.changes });
                resolve();
            }
        });
    });
};
exports.updatePodcast = updatePodcast;
//# sourceMappingURL=podcasts.js.map