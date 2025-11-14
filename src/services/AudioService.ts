/**
 * AudioService - Business logic for audio operations
 * 
 * Responsibilities:
 * - Audio chapter management
 * - Listening progress tracking
 * - User listening statistics
 * - Audio metadata operations
 */

import { BaseService } from './BaseService';
import { AudioRepository } from '../repositories/AudioRepository';
import { BookRepository } from '../repositories/BookRepository';
import { ILogger } from '../core/types';
import { Result } from '../core/Result';
import { AudioChapter, ListeningProgress } from '../database/models';

/**
 * Service for audio-related operations
 */
export class AudioService extends BaseService {
  /**
   * Create a new AudioService instance
   * @param audioRepository - Repository for audio operations
   * @param bookRepository - Repository for book operations
   * @param logger - Logger instance
   */
  constructor(
    private audioRepository: AudioRepository,
    private bookRepository: BookRepository,
    logger: ILogger
  ) {
    super(logger);
  }

  /**
   * Create audio chapter for a book
   * @param bookId - Book ID
   * @param title - Chapter title
   * @param duration - Duration in seconds
   * @param fileId - File ID from Telegram
   * @param chapterNumber - Chapter number
   * @returns Result with created audio
   */
  async createAudioChapter(
    bookId: number,
    title: string,
    duration: number,
    fileId: string,
    chapterNumber: number = 1
  ): Promise<Result<number>> {
    return this.executeAsync(
      async () => {
        // Check if book exists
        const book = await this.bookRepository.getById(bookId);
        if (!book) {
          throw new Error(`Book with ID ${bookId} not found`);
        }

        if (!title || title.trim().length === 0) {
          throw new Error('Chapter title cannot be empty');
        }

        if (duration <= 0) {
          throw new Error('Duration must be positive');
        }

        const chapter: AudioChapter = {
          book_id: bookId,
          title: title.trim(),
          duration,
          file_id: fileId,
          chapter_number: chapterNumber,
          created_at: new Date().toISOString(),
        };

        const chapterId = await this.audioRepository.createChapter(chapter);
        return chapterId;
      },
      `createAudioChapter(${bookId}, ${title})`
    );
  }

  /**
   * Get chapters for a book
   * @param bookId - Book ID
   * @returns Result with book chapters
   */
  async getBookChapters(bookId: number): Promise<Result<AudioChapter[]>> {
    return this.executeAsync(
      async () => await this.audioRepository.getBookChapters(bookId),
      `getBookChapters(${bookId})`
    );
  }

  /**
   * Get chapter details
   * @param chapterId - Chapter ID
   * @returns Result with chapter
   */
  async getChapterDetails(chapterId: number): Promise<Result<AudioChapter | null>> {
    return this.executeAsync(
      async () => await this.audioRepository.getChapterById(chapterId),
      `getChapterDetails(${chapterId})`
    );
  }

  /**
   * Save user's listening progress
   * @param userId - User ID
   * @param bookId - Book ID
   * @param chapterId - Current chapter ID
   * @param position - Current position in seconds
   * @returns Result with success status
   */
  async saveListeningProgress(
    userId: number,
    bookId: number,
    chapterId: number,
    position: number
  ): Promise<Result<void>> {
    return this.executeAsync(
      async () => {
        // Validate position
        if (position < 0) {
          throw new Error('Current position cannot be negative');
        }

        // Check if chapter exists
        const chapter = await this.audioRepository.getChapterById(chapterId);
        if (!chapter) {
          throw new Error(`Chapter with ID ${chapterId} not found`);
        }

        if (position > chapter.duration) {
          throw new Error('Current position cannot exceed chapter duration');
        }

        const progress: ListeningProgress = {
          user_id: userId,
          book_id: bookId,
          chapter_id: chapterId,
          position,
          total_listened: position,
          last_listened_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        };

        await this.audioRepository.saveListeningProgress(progress);
      },
      `saveListeningProgress(${userId}, ${bookId})`
    );
  }

  /**
   * Get user's listening progress for a book
   * @param userId - User ID
   * @param bookId - Book ID
   * @returns Result with listening progress
   */
  async getListeningProgress(
    userId: number,
    bookId: number
  ): Promise<Result<ListeningProgress | null>> {
    return this.executeAsync(
      async () => await this.audioRepository.getListeningProgress(userId, bookId),
      `getListeningProgress(${userId}, ${bookId})`
    );
  }

  /**
   * Get user's total listening time
   * @param userId - User ID
   * @returns Result with total listening time in seconds
   */
  async getUserTotalListeningTime(userId: number): Promise<Result<number>> {
    return this.executeAsync(
      async () => await this.audioRepository.getUserTotalListeningTime(userId),
      `getUserTotalListeningTime(${userId})`
    );
  }

  /**
   * Get user's listening statistics
   * @param userId - User ID
   * @returns Result with listening stats
   */
  async getUserListeningStats(
    userId: number
  ): Promise<
    Result<{
      totalBooks: number;
      totalDuration: number;
      averageDuration: number;
    }>
  > {
    return this.executeAsync(
      async () => {
        const progress = await this.audioRepository.getUserListeningProgress(userId);
        const totalBooks = new Set(progress.map((p) => p.book_id)).size;
        const totalDuration = progress.reduce((sum, p) => sum + (p.position || 0), 0);

        return {
          totalBooks,
          totalDuration,
          averageDuration: totalBooks > 0 ? totalDuration / totalBooks : 0,
        };
      },
      `getUserListeningStats(${userId})`
    );
  }

  /**
   * Get most listened audiobooks
   * @param limit - Number of books (default: 10)
   * @returns Result with most listened audiobooks (book IDs)
   */
  async getMostListenedAudiobooks(limit: number = 10): Promise<Result<number[]>> {
    return this.executeAsync(
      async () => {
        const progress = await this.audioRepository.getUserListeningProgress(0); // This would need adjustment
        // Group by book_id and sort by total listening time
        const bookStats = new Map<number, number>();
        progress.forEach((p) => {
          bookStats.set(p.book_id, (bookStats.get(p.book_id) || 0) + (p.position || 0));
        });

        return Array.from(bookStats.entries())
          .sort(([, a], [, b]) => b - a)
          .slice(0, limit)
          .map(([bookId]) => bookId);
      },
      `getMostListenedAudiobooks(${limit})`
    );
  }

  /**
   * Update chapter metadata
   * @param chapterId - Chapter ID
   * @param updates - Updated fields
   * @returns Result with success status
   */
  async updateChapter(
    chapterId: number,
    updates: Partial<Omit<AudioChapter, 'id'>>
  ): Promise<Result<number>> {
    return this.executeAsync(
      async () => {
        const chapter = await this.audioRepository.getChapterById(chapterId);
        if (!chapter) {
          throw new Error(`Chapter with ID ${chapterId} not found`);
        }

        return await this.audioRepository.updateChapter(chapterId, updates);
      },
      `updateChapter(${chapterId})`
    );
  }

  /**
   * Delete a chapter
   * @param chapterId - Chapter ID
   * @returns Result with success status
   */
  async deleteChapter(chapterId: number): Promise<Result<number>> {
    return this.executeAsync(
      async () => {
        const chapter = await this.audioRepository.getChapterById(chapterId);
        if (!chapter) {
          throw new Error(`Chapter with ID ${chapterId} not found`);
        }

        return await this.audioRepository.deleteChapter(chapterId);
      },
      `deleteChapter(${chapterId})`
    );
  }
}
