/**
 * Podcasts Database Functions
 */

import { db } from './db';
import { logger } from '../../utils/logger';

/**
 * Podcast interface
 */
export interface Podcast {
  id?: number;
  theme: string;
  description: string;
  file_type: 'audio' | 'link' | 'archive';
  file_url?: string;
  file_id?: string;
  file_name?: string;
  file_size?: number;
  duration?: number;
  cover_photo_id?: string;
  rating?: number;
  listens_count?: number;
  is_available?: boolean;
  created_at?: string;
  created_by?: number;
  updated_at?: string;
}

/**
 * Podcast Review interface
 */
export interface PodcastReview {
  id?: number;
  podcast_id: number;
  user_id: number;
  rating: number;
  comment?: string;
  is_published?: boolean;
  created_at?: string;
}

/**
 * Podcast Listen interface
 */
export interface PodcastListen {
  id?: number;
  podcast_id: number;
  user_id: number;
  listened_at?: string;
}

/**
 * Додати підкаст
 */
export const addPodcast = (podcast: Podcast): Promise<number> => {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO podcasts (
        theme, description, file_type, file_url, file_id, file_name, 
        file_size, duration, cover_photo_id, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(
      query,
      [
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
      ],
      function (err) {
        if (err) {
          logger.error('Error adding podcast', err, { theme: podcast.theme });
          reject(err);
        } else {
          logger.info('Podcast added', { id: this.lastID, theme: podcast.theme });
          resolve(this.lastID);
        }
      }
    );
  });
};

/**
 * Отримати всі підкасти
 */
export const getAllPodcasts = (): Promise<Podcast[]> => {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM podcasts WHERE is_available = 1 ORDER BY created_at DESC',
      [],
      (err, rows: Podcast[]) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
};

/**
 * Отримати всі підкасти з пагінацією
 */
export const getAllPodcastsWithPagination = (
  limit: number = 10,
  offset: number = 0
): Promise<{ podcasts: Podcast[]; total: number }> => {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT COUNT(*) as total FROM podcasts WHERE is_available = 1',
      [],
      (err, countRow: any) => {
        if (err) {
          reject(err);
          return;
        }

        db.all(
          'SELECT * FROM podcasts WHERE is_available = 1 ORDER BY created_at DESC LIMIT ? OFFSET ?',
          [limit, offset],
          (err, rows: Podcast[]) => {
            if (err) reject(err);
            else resolve({ podcasts: rows || [], total: countRow?.total || 0 });
          }
        );
      }
    );
  });
};

/**
 * Отримати підкаст за ID
 */
export const getPodcastById = (podcastId: number): Promise<Podcast | undefined> => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM podcasts WHERE id = ?', [podcastId], (err, row: Podcast) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

/**
 * Збільшити лічильник прослуховувань
 */
export const incrementPodcastListens = (podcastId: number, userId: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO podcast_listens (podcast_id, user_id) VALUES (?, ?)',
      [podcastId, userId],
      (err) => {
        if (err) {
          logger.error('Error adding podcast listen', err, { podcastId, userId });
          reject(err);
          return;
        }

        db.run(
          'UPDATE podcasts SET listens_count = listens_count + 1 WHERE id = ?',
          [podcastId],
          (updateErr) => {
            if (updateErr) {
              logger.error('Error updating listens count', updateErr, { podcastId });
              reject(updateErr);
            } else {
              logger.info('Podcast listen incremented', { podcastId, userId });
              resolve();
            }
          }
        );
      }
    );
  });
};

/**
 * Додати відгук на підкаст
 */
export const addPodcastReview = (review: PodcastReview): Promise<number> => {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO podcast_reviews (podcast_id, user_id, rating, comment) VALUES (?, ?, ?, ?)',
      [review.podcast_id, review.user_id, review.rating, review.comment || null],
      function (err) {
        if (err) {
          logger.error('Error adding podcast review', err, {
            podcast_id: review.podcast_id,
            user_id: review.user_id,
          });
          reject(err);
        } else {
          logger.info('Podcast review added', { id: this.lastID, podcast_id: review.podcast_id });
          updatePodcastRating(review.podcast_id).catch((updateErr) => {
            logger.error('Error updating podcast rating', updateErr, {
              podcast_id: review.podcast_id,
            });
          });
          resolve(this.lastID);
        }
      }
    );
  });
};

/**
 * Оновити середній рейтинг підкасту
 */
const updatePodcastRating = (podcastId: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT AVG(rating) as avg_rating FROM podcast_reviews WHERE podcast_id = ? AND is_published = 1',
      [podcastId],
      (err, row: { avg_rating: number }) => {
        if (err) {
          reject(err);
          return;
        }

        const avgRating = row?.avg_rating || 0;

        db.run(
          'UPDATE podcasts SET rating = ? WHERE id = ?',
          [avgRating, podcastId],
          (updateErr) => {
            if (updateErr) reject(updateErr);
            else resolve();
          }
        );
      }
    );
  });
};

/**
 * Отримати відгуки підкасту
 */
export const getPodcastReviews = (podcastId: number): Promise<PodcastReview[]> => {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM podcast_reviews WHERE podcast_id = ? AND is_published = 1 ORDER BY created_at DESC',
      [podcastId],
      (err, rows: PodcastReview[]) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
};

/**
 * Видалити підкаст
 */
export const deletePodcast = (podcastId: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM podcasts WHERE id = ?', [podcastId], function (err) {
      if (err) {
        logger.error('Error deleting podcast', err, { podcastId });
        reject(err);
      } else {
        logger.info('Podcast deleted', { podcastId, changes: this.changes });
        resolve();
      }
    });
  });
};

/**
 * Оновити підкаст
 */
export const updatePodcast = (podcastId: number, updates: Partial<Podcast>): Promise<void> => {
  return new Promise((resolve, reject) => {
    const fields = Object.keys(updates).filter((key) => key !== 'id');
    const setClause = fields.map((field) => `${field} = ?`).join(', ');
    const values = fields.map((field) => (updates as any)[field]);

    if (fields.length === 0) {
      resolve();
      return;
    }

    const query = `UPDATE podcasts SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;

    db.run(query, [...values, podcastId], function (err) {
      if (err) {
        logger.error('Error updating podcast', err, { podcastId, updates });
        reject(err);
      } else {
        logger.info('Podcast updated successfully', { podcastId, changes: this.changes });
        resolve();
      }
    });
  });
};
