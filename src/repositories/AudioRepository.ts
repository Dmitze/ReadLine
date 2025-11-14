import { BaseRepository } from './BaseRepository';
import { IDatabase } from '../core/types';

/**
 * AudioChapter entity interface
 */
export interface AudioChapter {
  id?: number;
  book_id: number;
  chapter_number: number;
  title: string;
  file_id: string;
  duration: number;
  created_at?: string;
}

/**
 * ListeningProgress entity interface
 */
export interface ListeningProgress {
  id?: number;
  user_id: number;
  book_id: number;
  chapter_id?: number;
  position: number;
  total_listened: number;
  last_listened_at?: string;
  created_at?: string;
}

/**
 * AudioRepository - Manages audio chapters and listening progress
 * Handles audiobook chapters, user listening progress, and audio statistics
 */
export class AudioRepository extends BaseRepository<AudioChapter> {
  /**
   * Creates instance of AudioRepository
   * @param db DatabaseWrapper instance
   */
  constructor(db: any) {
    super(db, 'audio_chapters');
  }

  /**
   * Create a new audio chapter
   * @param chapter AudioChapter data
   * @returns Promise with chapter ID
   */
  async createChapter(chapter: AudioChapter): Promise<number> {
    return this.insert({
      ...chapter,
      duration: chapter.duration || 0
    });
  }

  /**
   * Get all chapters for a book ordered by chapter number
   * @param bookId Book ID
   * @returns Promise with AudioChapter array
   */
  async getBookChapters(bookId: number): Promise<AudioChapter[]> {
    const query = 'SELECT * FROM audio_chapters WHERE book_id = ? ORDER BY chapter_number ASC';
    return this.query(query, [bookId]);
  }

  /**
   * Get a single chapter by ID
   * @param chapterId Chapter ID
   * @returns Promise with AudioChapter or null
   */
  async getChapterById(chapterId: number): Promise<AudioChapter | null> {
    const chapters = await this.query<AudioChapter>(
      'SELECT * FROM audio_chapters WHERE id = ?',
      [chapterId]
    );
    return chapters[0] || null;
  }

  /**
   * Update an audio chapter
   * @param chapterId Chapter ID
   * @param updates Partial chapter data
   * @returns Promise with number of affected rows
   */
  async updateChapter(chapterId: number, updates: Partial<AudioChapter>): Promise<number> {
    return this.update(chapterId, updates);
  }

  /**
   * Delete an audio chapter
   * @param chapterId Chapter ID
   * @returns Promise with number of deleted rows
   */
  async deleteChapter(chapterId: number): Promise<number> {
    return this.delete(chapterId);
  }

  /**
   * Get chapter count for a book
   * @param bookId Book ID
   * @returns Promise with chapter count
   */
  async getChapterCount(bookId: number): Promise<number> {
    return this.count({ book_id: bookId });
  }

  /**
   * Save or update user listening progress
   * @param progress ListeningProgress data
   * @returns Promise<void>
   */
  async saveListeningProgress(progress: ListeningProgress): Promise<void> {
    const query = `
      INSERT INTO listening_progress (user_id, book_id, chapter_id, position, total_listened, last_listened_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, book_id) DO UPDATE SET
        chapter_id = excluded.chapter_id,
        position = excluded.position,
        total_listened = total_listened + excluded.total_listened,
        last_listened_at = CURRENT_TIMESTAMP
    `;
    
    await this.db.run(query, [
      progress.user_id,
      progress.book_id,
      progress.chapter_id || null,
      progress.position,
      progress.total_listened || 0
    ]);
  }

  /**
   * Get user's listening progress for a specific book
   * @param userId User ID
   * @param bookId Book ID
   * @returns Promise with ListeningProgress or null
   */
  async getListeningProgress(userId: number, bookId: number): Promise<ListeningProgress | null> {
    const results = await this.db.all<ListeningProgress>(
      'SELECT * FROM listening_progress WHERE user_id = ? AND book_id = ?',
      [userId, bookId]
    );
    return results[0] || null;
  }

  /**
   * Get all listening progress for a user ordered by most recent
   * @param userId User ID
   * @returns Promise with ListeningProgress array
   */
  async getUserListeningProgress(userId: number): Promise<ListeningProgress[]> {
    return this.db.all<ListeningProgress>(
      'SELECT * FROM listening_progress WHERE user_id = ? ORDER BY last_listened_at DESC',
      [userId]
    );
  }

  /**
   * Get user's total listening time in seconds
   * @param userId User ID
   * @returns Promise with total seconds
   */
  async getUserTotalListeningTime(userId: number): Promise<number> {
    const results = await this.db.all<{ total: number | null }>(
      'SELECT SUM(total_listened) as total FROM listening_progress WHERE user_id = ?',
      [userId]
    );
    return results[0]?.total || 0;
  }

  /**
   * Get most listened audiobooks
   * @param limit Maximum number of results
   * @returns Promise with book data including listening stats
   */
  async getMostListenedAudiobooks(limit: number = 10): Promise<Array<any>> {
    const query = `
      SELECT b.*, 
             SUM(lp.total_listened) as total_time, 
             COUNT(DISTINCT lp.user_id) as listeners_count
      FROM books b
      INNER JOIN listening_progress lp ON b.id = lp.book_id
      WHERE b.audio_file_id IS NOT NULL
      GROUP BY b.id
      ORDER BY total_time DESC
      LIMIT ?
    `;
    return this.db.all(query, [limit]);
  }

  /**
   * Get user's listening statistics
   * @param userId User ID
   * @returns Promise with listening stats
   */
  async getUserListeningStats(userId: number): Promise<{
    totalTime: number;
    booksListened: number;
    averageTimePerBook: number;
  }> {
    const totalTime = await this.getUserTotalListeningTime(userId);
    
    const results = await this.db.all<{ count: number }>(
      'SELECT COUNT(DISTINCT book_id) as count FROM listening_progress WHERE user_id = ?',
      [userId]
    );
    const booksListened = results[0]?.count || 0;
    
    return {
      totalTime,
      booksListened,
      averageTimePerBook: booksListened > 0 ? totalTime / booksListened : 0
    };
  }

  /**
   * Delete listening progress for a user and book
   * @param userId User ID
   * @param bookId Book ID
   * @returns Promise<void>
   */
  async deleteListeningProgress(userId: number, bookId: number): Promise<void> {
    await this.db.run(
      'DELETE FROM listening_progress WHERE user_id = ? AND book_id = ?',
      [userId, bookId]
    );
  }

  /**
   * Get books with audio chapters
   * @param limit Maximum number of results
   * @returns Promise with books that have audio
   */
  async getBooksWithAudio(limit: number = 20): Promise<Array<any>> {
    const query = `
      SELECT DISTINCT b.* FROM books b
      INNER JOIN audio_chapters ac ON b.id = ac.book_id
      WHERE b.is_available = 1
      LIMIT ?
    `;
    return this.db.all(query, [limit]);
  }

  /**
   * Get total audio content duration for a book
   * @param bookId Book ID
   * @returns Promise with total duration in seconds
   */
  async getBookTotalDuration(bookId: number): Promise<number> {
    const results = await this.db.all<{ total: number | null }>(
      'SELECT SUM(duration) as total FROM audio_chapters WHERE book_id = ?',
      [bookId]
    );
    return results[0]?.total || 0;
  }

  /**
   * Get user's current position in book audiobook
   * @param userId User ID
   * @param bookId Book ID
   * @returns Promise with current chapter and position
   */
  async getUserBookPosition(userId: number, bookId: number): Promise<{
    chapterId: number | null;
    position: number;
  } | null> {
    const results = await this.db.all<ListeningProgress>(
      'SELECT chapter_id, position FROM listening_progress WHERE user_id = ? AND book_id = ?',
      [userId, bookId]
    );
    
    if (!results[0]) return null;
    
    return {
      chapterId: results[0].chapter_id || null,
      position: results[0].position
    };
  }

  /**
   * Clear all listening progress for a user
   * @param userId User ID
   * @returns Promise<void>
   */
  async clearUserListeningProgress(userId: number): Promise<void> {
    await this.db.run(
      'DELETE FROM listening_progress WHERE user_id = ?',
      [userId]
    );
  }
}
