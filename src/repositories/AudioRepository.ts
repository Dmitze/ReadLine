import { BaseRepository } from './BaseRepository';

export interface AudioChapter {
  id?: number;
  book_id: number;
  chapter_number: number;
  title: string;
  file_id: string;
  duration: number;
  created_at?: string;
}

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

export class AudioRepository extends BaseRepository<AudioChapter> {
  constructor(db: any) {
    super(db, 'audio_chapters');
  }

  async createChapter(chapter: AudioChapter): Promise<number> {
    return this.insert({
      ...chapter,
      duration: chapter.duration || 0,
    });
  }

  async getBookChapters(bookId: number): Promise<AudioChapter[]> {
    const query = 'SELECT * FROM audio_chapters WHERE book_id = ? ORDER BY chapter_number ASC';
    return this.query(query, [bookId]);
  }

  async getChapterById(chapterId: number): Promise<AudioChapter | null> {
    const chapters = await this.query<AudioChapter>('SELECT * FROM audio_chapters WHERE id = ?', [
      chapterId,
    ]);
    return chapters[0] || null;
  }

  async updateChapter(chapterId: number, updates: Partial<AudioChapter>): Promise<number> {
    return this.update(chapterId, updates);
  }

  async deleteChapter(chapterId: number): Promise<number> {
    return this.delete(chapterId);
  }

  async getChapterCount(bookId: number): Promise<number> {
    return this.count({ book_id: bookId });
  }

  async saveListeningProgress(progress: ListeningProgress): Promise<void> {
    const query = `
      INSERT INTO audio_progress (user_id, book_id, chapter_id, position, total_listened, last_listened_at)
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
      progress.total_listened || 0,
    ]);
  }

  async getListeningProgress(userId: number, bookId: number): Promise<ListeningProgress | null> {
    const results = await this.db.all<ListeningProgress>(
      'SELECT * FROM audio_progress WHERE user_id = ? AND book_id = ?',
      [userId, bookId]
    );
    return results[0] || null;
  }

  async getUserListeningProgress(userId: number): Promise<ListeningProgress[]> {
    return this.db.all<ListeningProgress>(
      'SELECT * FROM audio_progress WHERE user_id = ? ORDER BY last_listened_at DESC',
      [userId]
    );
  }

  async getUserTotalListeningTime(userId: number): Promise<number> {
    const results = await this.db.all<{ total: number | null }>(
      'SELECT SUM(total_listened) as total FROM audio_progress WHERE user_id = ?',
      [userId]
    );
    return results[0]?.total || 0;
  }

  async getMostListenedAudiobooks(limit: number = 10): Promise<Array<any>> {
    const query = `
      SELECT b.*, 
             SUM(lp.total_listened) as total_time, 
             COUNT(DISTINCT lp.user_id) as listeners_count
      FROM books b
      INNER JOIN audio_progress lp ON b.id = lp.book_id
      WHERE b.audio_file_id IS NOT NULL
      GROUP BY b.id
      ORDER BY total_time DESC
      LIMIT ?
    `;
    return this.db.all(query, [limit]);
  }

  async getUserListeningStats(userId: number): Promise<{
    totalTime: number;
    booksListened: number;
    averageTimePerBook: number;
  }> {
    const totalTime = await this.getUserTotalListeningTime(userId);

    const results = await this.db.all<{ count: number }>(
      'SELECT COUNT(DISTINCT book_id) as count FROM audio_progress WHERE user_id = ?',
      [userId]
    );
    const booksListened = results[0]?.count || 0;

    return {
      totalTime,
      booksListened,
      averageTimePerBook: booksListened > 0 ? totalTime / booksListened : 0,
    };
  }

  async deleteListeningProgress(userId: number, bookId: number): Promise<void> {
    await this.db.run('DELETE FROM audio_progress WHERE user_id = ? AND book_id = ?', [
      userId,
      bookId,
    ]);
  }

  async getBooksWithAudio(limit: number = 20): Promise<Array<any>> {
    const query = `
      SELECT DISTINCT b.* FROM books b
      INNER JOIN audio_chapters ac ON b.id = ac.book_id
      WHERE b.is_available = 1
      LIMIT ?
    `;
    return this.db.all(query, [limit]);
  }

  async getBookTotalDuration(bookId: number): Promise<number> {
    const results = await this.db.all<{ total: number | null }>(
      'SELECT SUM(duration) as total FROM audio_chapters WHERE book_id = ?',
      [bookId]
    );
    return results[0]?.total || 0;
  }

  async getUserBookPosition(
    userId: number,
    bookId: number
  ): Promise<{
    chapterId: number | null;
    position: number;
  } | null> {
    const results = await this.db.all<ListeningProgress>(
      'SELECT chapter_id, position FROM audio_progress WHERE user_id = ? AND book_id = ?',
      [userId, bookId]
    );

    if (!results[0]) return null;

    return {
      chapterId: results[0].chapter_id || null,
      position: results[0].position,
    };
  }

  async clearUserListeningProgress(userId: number): Promise<void> {
    await this.db.run('DELETE FROM audio_progress WHERE user_id = ?', [userId]);
  }

  async findById(id: number): Promise<AudioChapter | undefined> {
    const result = await this.getChapterById(id);
    return result || undefined;
  }

  async findByBookId(bookId: number): Promise<AudioChapter[]> {
    return this.getBookChapters(bookId);
  }

  async findByNarrator(_narrator: string): Promise<AudioChapter[]> {
    return [];
  }

  async findByQuality(_quality: string): Promise<AudioChapter[]> {
    return [];
  }

  async findAll(limit?: number, offset?: number): Promise<AudioChapter[]> {
    return this.getAll(limit, offset);
  }
}
