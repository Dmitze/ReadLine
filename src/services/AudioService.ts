/**
 * Audio Service - Бізнес-логіка для роботи з аудіокнигами
 * REFACTOR-003: Service Layer
 */

import { AudioRepository } from '../repositories/AudioRepository';
import { BookRepository } from '../repositories/BookRepository';
import { Result, Ok, Err } from '../core/Result';

export interface CreateAudioInput {
  book_id: number;
  file_id: string;
  duration: number;
  narrator?: string;
  quality?: 'low' | 'medium' | 'high';
}

export interface UpdateAudioInput {
  duration?: number;
  narrator?: string;
  quality?: 'low' | 'medium' | 'high';
}

export class AudioService {
  constructor(
    private audioRepository: AudioRepository,
    private bookRepository: BookRepository
  ) {}

  /**
   * Додати аудіоверсію книги
   */
  async addAudioVersion(input: CreateAudioInput): Promise<Result<number>> {
    try {
      const book = await this.bookRepository.findById(input.book_id);
      if (!book) {
        return new Err(new Error(`Book with id ${input.book_id} not found`));
      }

      if (!input.file_id) {
        return new Err(new Error('Audio file_id is required'));
      }

      if (input.duration <= 0) {
        return new Err(new Error('Duration must be greater than 0'));
      }

      const audioId = await this.audioRepository.insert({
        book_id: input.book_id,
        chapter_number: 1,
        title: `Audio ${input.file_id}`,
        file_id: input.file_id,
        duration: input.duration,
      });

      return new Ok(audioId);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to add audio version'));
    }
  }

  /**
   * Отримати аудіоверсію за ID
   */
  async getAudioById(audioId: number): Promise<Result<any>> {
    try {
      const audio = await this.audioRepository.findById(audioId);
      if (!audio) {
        return new Err(new Error(`Audio with id ${audioId} not found`));
      }
      return new Ok(audio);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to fetch audio'));
    }
  }

  /**
   * Отримати аудіоверсії книги
   */
  async getBookAudio(bookId: number): Promise<Result<any[]>> {
    try {
      const book = await this.bookRepository.findById(bookId);
      if (!book) {
        return new Err(new Error(`Book with id ${bookId} not found`));
      }

      const audioVersions = await this.audioRepository.findByBookId(bookId);
      return new Ok(audioVersions);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to fetch audio versions'));
    }
  }

  /**
   * Оновити аудіоверсію
   */
  async updateAudio(audioId: number, input: UpdateAudioInput): Promise<Result<void>> {
    try {
      const audio = await this.audioRepository.findById(audioId);
      if (!audio) {
        return new Err(new Error(`Audio with id ${audioId} not found`));
      }

      if (input.duration && input.duration <= 0) {
        return new Err(new Error('Duration must be greater than 0'));
      }

      await this.audioRepository.update(audioId, {
        duration: input.duration || audio.duration,
      });

      return new Ok(undefined);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to update audio'));
    }
  }

  /**
   * Видалити аудіоверсію
   */
  async deleteAudio(audioId: number): Promise<Result<void>> {
    try {
      const audio = await this.audioRepository.findById(audioId);
      if (!audio) {
        return new Err(new Error(`Audio with id ${audioId} not found`));
      }

      await this.audioRepository.delete(audioId);
      return new Ok(undefined);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to delete audio'));
    }
  }

  /**
   * Отримати аудіо за автором/наратором
   */
  async getAudioByNarrator(narrator: string): Promise<Result<any[]>> {
    try {
      const audioVersions = await this.audioRepository.findByNarrator(narrator);
      return new Ok(audioVersions);
    } catch (error) {
      return new Err(
        error instanceof Error ? error : new Error('Failed to fetch audio by narrator')
      );
    }
  }

  /**
   * Отримати всі аудіоверсії з якістю
   */
  async getAudioByQuality(quality: 'low' | 'medium' | 'high'): Promise<Result<any[]>> {
    try {
      const audioVersions = await this.audioRepository.findByQuality(quality);
      return new Ok(audioVersions);
    } catch (error) {
      return new Err(
        error instanceof Error ? error : new Error('Failed to fetch audio by quality')
      );
    }
  }

  /**
   * Отримати загальну тривалість всіх аудіокниг
   */
  async getTotalAudioDuration(): Promise<Result<number>> {
    try {
      const allAudio = await this.audioRepository.findAll();
      const totalDuration = allAudio.reduce((sum, a) => sum + (a.duration || 0), 0);
      return new Ok(totalDuration);
    } catch (error) {
      return new Err(
        error instanceof Error ? error : new Error('Failed to calculate total duration')
      );
    }
  }

  /**
   * Отримати статистику аудіокниг
   */
  async getAudioStats(): Promise<Result<any>> {
    try {
      const allAudio = await this.audioRepository.findAll();
      const totalDuration = allAudio.reduce((sum, a) => sum + (a.duration || 0), 0);

      return new Ok({
        total_count: allAudio.length,
        total_duration: totalDuration,
        average_duration: allAudio.length > 0 ? totalDuration / allAudio.length : 0,
      });
    } catch (error) {
      return new Err(
        error instanceof Error ? error : new Error('Failed to fetch audio statistics')
      );
    }
  }
}
