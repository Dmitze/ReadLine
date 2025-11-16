/**
 * Recommendation Service - Бізнес-логіка для рекомендацій книг
 * REFACTOR-003: Service Layer
 */

import { BookRepository } from '../repositories/BookRepository';
import { SavedBookRepository } from '../repositories/SavedBookRepository';
import { ReviewRepository } from '../repositories/ReviewRepository';
import { Result, Ok, Err } from '../core/Result';

export interface RecommendationRequest {
  userId?: number;
  genre?: string;
  rating?: number;
  limit?: number;
}

export class RecommendationService {
  constructor(
    private bookRepository: BookRepository,
    private savedBookRepository: SavedBookRepository,
    private reviewRepository: ReviewRepository
  ) {}

  /**
   * Отримати персоналізовані рекомендації на основі збережених книг
   */
  async getPersonalizedRecommendations(userId: number, limit: number = 10): Promise<Result<any[]>> {
    try {
      // Отримати жанри збережених книг користувача
      const savedBooks = await this.savedBookRepository.findByUserId(userId);
      if (savedBooks.length === 0) {
        // Якщо немає збережених книг, повернути популярні
        return this.getPopularRecommendations(limit);
      }

      // Витягнути жанри
      const genres = new Set<string>();
      for (const saved of savedBooks) {
        const book = await this.bookRepository.findById(saved.book_id);
        if (book?.genre) {
          genres.add(book.genre);
        }
      }

      // Отримати книги за жанрами
      const recommendations = new Map<number, any>();
      for (const genre of genres) {
        const books = await this.bookRepository.findByGenre(genre);
        // Pagination is applied manually
        for (const book of books.slice(0, limit * 2)) {
          const bookId = book.id ?? 0;
          if (bookId && !savedBooks.find((s) => s.book_id === bookId)) {
            recommendations.set(bookId, book);
          }
        }
      }

      return new Ok(Array.from(recommendations.values()).slice(0, limit));
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to get recommendations'));
    }
  }

  /**
   * Отримати популярні рекомендації
   */
  async getPopularRecommendations(limit: number = 10): Promise<Result<any[]>> {
    try {
      const books = await this.bookRepository.findMostRated(limit);
      return new Ok(books);
    } catch (error) {
      return new Err(
        error instanceof Error ? error : new Error('Failed to get popular recommendations')
      );
    }
  }

  /**
   * Отримати рекомендації за жанром
   */
  async getRecommendationsByGenre(genre: string, limit: number = 10): Promise<Result<any[]>> {
    try {
      const books = await this.bookRepository.findByGenre(genre);
      return new Ok(books.slice(0, limit));
    } catch (error) {
      return new Err(
        error instanceof Error ? error : new Error('Failed to get genre recommendations')
      );
    }
  }

  /**
   * Отримати рекомендації на основі рейтингу
   */
  async getRecommendationsByRating(
    minRating: number = 4,
    limit: number = 10
  ): Promise<Result<any[]>> {
    try {
      if (minRating < 1 || minRating > 5) {
        return new Err(new Error('Rating must be between 1 and 5'));
      }

      const allBooks = await this.bookRepository.findAll();
      const filtered: any[] = [];

      for (const book of allBooks) {
        if (!book.id) continue;
        const reviews = await this.reviewRepository.findByBookId(book.id);
        if (reviews.length > 0) {
          const avgRating = reviews.reduce((sum, r) => sum + (r.rating ?? 0), 0) / reviews.length;
          if (avgRating >= minRating) {
            filtered.push({ ...book, rating: avgRating });
          }
        }
      }

      return new Ok(filtered.sort((a, b) => b.rating - a.rating).slice(0, limit));
    } catch (error) {
      return new Err(
        error instanceof Error ? error : new Error('Failed to get rating recommendations')
      );
    }
  }

  /**
   * Отримати "Читай далі" рекомендації
   */
  async getContinueReadingRecommendations(
    userId: number,
    limit: number = 5
  ): Promise<Result<any[]>> {
    try {
      const savedBooks = await this.savedBookRepository.findByUserId(userId);

      if (savedBooks.length === 0) {
        return new Ok([]);
      }

      // Отримати остаток переглянуті книги (відсортовані за ID - найнові першими)
      const recentBooks = savedBooks.slice(0, 5);

      const recommendations = new Map<number, any>();

      for (const saved of recentBooks) {
        const book = await this.bookRepository.findById(saved.book_id);
        if (book && book.id) {
          // Отримати книги того ж автора або жанру
          const byGenre = await this.bookRepository.findByGenre(book.genre);
          for (const recommended of byGenre.slice(0, limit * 2)) {
            const recId = recommended.id ?? 0;
            if (recId && recId !== book.id && !savedBooks.find((s) => s.book_id === recId)) {
              recommendations.set(recId, recommended);
            }
          }
        }
      }

      return new Ok(Array.from(recommendations.values()).slice(0, limit));
    } catch (error) {
      return new Err(
        error instanceof Error ? error : new Error('Failed to get continue reading recommendations')
      );
    }
  }

  /**
   * Отримати рекомендації на основі схожості
   */
  async getSimilarRecommendations(bookId: number, limit: number = 5): Promise<Result<any[]>> {
    try {
      const book = await this.bookRepository.findById(bookId);
      if (!book) {
        return new Err(new Error(`Book with id ${bookId} not found`));
      }

      const similarBooks = await this.bookRepository.findByGenre(book.genre);
      const filtered = similarBooks.filter((b) => b.id !== bookId).slice(0, limit);

      return new Ok(filtered);
    } catch (error) {
      return new Err(
        error instanceof Error ? error : new Error('Failed to get similar recommendations')
      );
    }
  }

  /**
   * Отримати рекомендації "Ви можете пропустити"
   */
  async getTrendingRecommendations(limit: number = 10): Promise<Result<any[]>> {
    try {
      const books = await this.bookRepository.findNewest(limit);
      return new Ok(books);
    } catch (error) {
      return new Err(
        error instanceof Error ? error : new Error('Failed to get trending recommendations')
      );
    }
  }

  /**
   * Отримати рекомендації на основі тегів
   */
  async getRecommendationsByTags(tags: string[], limit: number = 10): Promise<Result<any[]>> {
    try {
      // Це спрощена реалізація
      // У реальному проекті потрібна більш складна логіка пошуку за тегами
      const allBooks = await this.bookRepository.findAll();
      return new Ok(allBooks.slice(0, limit));
    } catch (error) {
      return new Err(
        error instanceof Error ? error : new Error('Failed to get tag recommendations')
      );
    }
  }

  /**
   * Оцінити релевантність рекомендацій
   */
  async getRankingScore(bookId: number, userId?: number): Promise<Result<number>> {
    try {
      const book = await this.bookRepository.findById(bookId);
      if (!book) {
        return new Err(new Error(`Book with id ${bookId} not found`));
      }

      let score = 50; // Базовий бал

      // Додати бали за рейтинг
      const reviews = await this.reviewRepository.findByBookId(bookId);
      if (reviews.length > 0) {
        const avgRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length;
        score += avgRating * 10;
      }

      // Додати бали за популярність (кількість рецензій)
      score += Math.min(reviews.length, 50);

      return new Ok(Math.min(score, 100));
    } catch (error) {
      return new Err(
        error instanceof Error ? error : new Error('Failed to calculate ranking score')
      );
    }
  }
}
