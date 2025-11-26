"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudioRepository = void 0;
const BaseRepository_1 = require("./BaseRepository");
class AudioRepository extends BaseRepository_1.BaseRepository {
    constructor(db) {
        super(db, 'audio_chapters');
    }
    async createChapter(chapter) {
        return this.insert({
            ...chapter,
            duration: chapter.duration || 0,
        });
    }
    async getBookChapters(bookId) {
        const query = 'SELECT * FROM audio_chapters WHERE book_id = ? ORDER BY chapter_number ASC';
        return this.query(query, [bookId]);
    }
    async getChapterById(chapterId) {
        const chapters = await this.query('SELECT * FROM audio_chapters WHERE id = ?', [
            chapterId,
        ]);
        return chapters[0] || null;
    }
    async updateChapter(chapterId, updates) {
        return this.update(chapterId, updates);
    }
    async deleteChapter(chapterId) {
        return this.delete(chapterId);
    }
    async getChapterCount(bookId) {
        return this.count({ book_id: bookId });
    }
    async saveListeningProgress(progress) {
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
    async getListeningProgress(userId, bookId) {
        const results = await this.db.all('SELECT * FROM audio_progress WHERE user_id = ? AND book_id = ?', [userId, bookId]);
        return results[0] || null;
    }
    async getUserListeningProgress(userId) {
        return this.db.all('SELECT * FROM audio_progress WHERE user_id = ? ORDER BY last_listened_at DESC', [userId]);
    }
    async getUserTotalListeningTime(userId) {
        const results = await this.db.all('SELECT SUM(total_listened) as total FROM audio_progress WHERE user_id = ?', [userId]);
        return results[0]?.total || 0;
    }
    async getMostListenedAudiobooks(limit = 10) {
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
    async getUserListeningStats(userId) {
        const totalTime = await this.getUserTotalListeningTime(userId);
        const results = await this.db.all('SELECT COUNT(DISTINCT book_id) as count FROM audio_progress WHERE user_id = ?', [userId]);
        const booksListened = results[0]?.count || 0;
        return {
            totalTime,
            booksListened,
            averageTimePerBook: booksListened > 0 ? totalTime / booksListened : 0,
        };
    }
    async deleteListeningProgress(userId, bookId) {
        await this.db.run('DELETE FROM audio_progress WHERE user_id = ? AND book_id = ?', [
            userId,
            bookId,
        ]);
    }
    async getBooksWithAudio(limit = 20) {
        const query = `
      SELECT DISTINCT b.* FROM books b
      INNER JOIN audio_chapters ac ON b.id = ac.book_id
      WHERE b.is_available = 1
      LIMIT ?
    `;
        return this.db.all(query, [limit]);
    }
    async getBookTotalDuration(bookId) {
        const results = await this.db.all('SELECT SUM(duration) as total FROM audio_chapters WHERE book_id = ?', [bookId]);
        return results[0]?.total || 0;
    }
    async getUserBookPosition(userId, bookId) {
        const results = await this.db.all('SELECT chapter_id, position FROM audio_progress WHERE user_id = ? AND book_id = ?', [userId, bookId]);
        if (!results[0])
            return null;
        return {
            chapterId: results[0].chapter_id || null,
            position: results[0].position,
        };
    }
    async clearUserListeningProgress(userId) {
        await this.db.run('DELETE FROM audio_progress WHERE user_id = ?', [userId]);
    }
    async findById(id) {
        const result = await this.getChapterById(id);
        return result || undefined;
    }
    async findByBookId(bookId) {
        return this.getBookChapters(bookId);
    }
    async findByNarrator(_narrator) {
        return [];
    }
    async findByQuality(_quality) {
        return [];
    }
    async findAll(limit, offset) {
        return this.getAll(limit, offset);
    }
}
exports.AudioRepository = AudioRepository;
//# sourceMappingURL=AudioRepository.js.map