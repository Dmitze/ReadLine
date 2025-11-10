/**
 * Audio-related database functions
 */

import { db } from './models';
import { AudioChapter, ListeningProgress, Book } from './models';

// ==================== AUDIO CHAPTERS ====================

export const addAudioChapter = (chapter: AudioChapter): Promise<number> => {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO audio_chapters (book_id, chapter_number, title, file_id, duration) 
       VALUES (?, ?, ?, ?, ?)`,
      [chapter.book_id, chapter.chapter_number, chapter.title, chapter.file_id, chapter.duration || 0],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
};

export const getBookChapters = (bookId: number): Promise<AudioChapter[]> => {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM audio_chapters WHERE book_id = ? ORDER BY chapter_number ASC',
      [bookId],
      (err, rows: AudioChapter[]) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
};

export const getChapterById = (chapterId: number): Promise<AudioChapter | null> => {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM audio_chapters WHERE id = ?',
      [chapterId],
      (err, row: AudioChapter) => {
        if (err) reject(err);
        else resolve(row || null);
      }
    );
  });
};

export const deleteAudioChapter = (chapterId: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run(
      'DELETE FROM audio_chapters WHERE id = ?',
      [chapterId],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
};

// ==================== LISTENING PROGRESS ====================

export const saveListeningProgress = (progress: ListeningProgress): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO listening_progress (user_id, book_id, chapter_id, position, total_listened, last_listened_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id, book_id) DO UPDATE SET
         chapter_id = excluded.chapter_id,
         position = excluded.position,
         total_listened = total_listened + excluded.total_listened,
         last_listened_at = CURRENT_TIMESTAMP`,
      [progress.user_id, progress.book_id, progress.chapter_id || null, progress.position, progress.total_listened || 0],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
};

export const getListeningProgress = (userId: number, bookId: number): Promise<ListeningProgress | null> => {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM listening_progress WHERE user_id = ? AND book_id = ?',
      [userId, bookId],
      (err, row: ListeningProgress) => {
        if (err) reject(err);
        else resolve(row || null);
      }
    );
  });
};

export const getUserListeningProgress = (userId: number): Promise<ListeningProgress[]> => {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM listening_progress WHERE user_id = ? ORDER BY last_listened_at DESC',
      [userId],
      (err, rows: ListeningProgress[]) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
};

export const getUserTotalListeningTime = (userId: number): Promise<number> => {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT SUM(total_listened) as total FROM listening_progress WHERE user_id = ?',
      [userId],
      (err, row: any) => {
        if (err) reject(err);
        else resolve(row?.total || 0);
      }
    );
  });
};

export const getMostListenedAudiobooks = (limit: number = 10): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT b.*, SUM(lp.total_listened) as total_time, COUNT(DISTINCT lp.user_id) as listeners_count
       FROM books b
       INNER JOIN listening_progress lp ON b.id = lp.book_id
       WHERE b.audio_file_id IS NOT NULL
       GROUP BY b.id
       ORDER BY total_time DESC
       LIMIT ?`,
      [limit],
      (err, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
};

export const deleteListeningProgress = (userId: number, bookId: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run(
      'DELETE FROM listening_progress WHERE user_id = ? AND book_id = ?',
      [userId, bookId],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
};
