/**
 * User Management Service
 * Handles business logic for user operations, profiles, and statistics
 */

import { Result, ok, err } from '../core/Result';
import { logger } from '../utils/logger';
import { LIMITS } from '../constants/limits';

export interface UserStats {
  savedBooksCount: number;
  reviewsCount: number;
  totalListeningTime: number;
  favoriteGenres: string[];
}

export interface UserProfile {
  userId: number;
  firstName: string;
  lastName: string;
  username: string;
  stats: UserStats;
  favoriteGenres: string[];
  userTags: string[];
}

export interface PersonalCollectionResult {
  books: any[];
  source: 'smart_recommendations' | 'top_books' | 'new_books';
  count: number;
}

export class UserManagementService {
  constructor(private db: any) {}

  /**
   * Get complete user profile with statistics and preferences
   */
  async getUserProfile(userId: number): Promise<Result<UserProfile, Error>> {
    try {
      // Get basic user info
      const { getUserDetailedStats } = await import('../database/userFunctions');
      const stats = await getUserDetailedStats(userId);

      // Get saved books for genre analysis
      const { getSavedBooks } = await import('../database/models');
      const { getBookTags } = await import('../database/tagFunctions');
      const savedBooks = await getSavedBooks(userId);

      // Collect genres from saved books
      const genresFromBooks = new Set<string>();
      savedBooks.forEach((book) => {
        if (book.genre) {
          genresFromBooks.add(book.genre);
        }
      });

      // Combine with favorite genres
      const allGenres = [...new Set([...stats.favoriteGenres, ...Array.from(genresFromBooks)])];

      // Collect user tags
      const allUserTags = new Set<string>();
      for (const book of savedBooks) {
        const bookTags = await getBookTags(book.id!);
        bookTags.forEach((tag) => allUserTags.add(tag.name));
      }

      const profile: UserProfile = {
        userId,
        firstName: '', // Will be filled by caller
        lastName: '',
        username: '',
        stats,
        favoriteGenres: allGenres,
        userTags: Array.from(allUserTags),
      };

      return ok(profile);
    } catch (error) {
      const errMsg = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to get user profile', errMsg, { userId });
      return err(errMsg);
    }
  }

  /**
   * Get detailed user statistics
   */
  async getUserStats(userId: number): Promise<Result<UserStats, Error>> {
    try {
      const { getUserDetailedStats } = await import('../database/userFunctions');
      const stats = await getUserDetailedStats(userId);
      return ok(stats);
    } catch (error) {
      const errMsg = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to get user stats', errMsg, { userId });
      return err(errMsg);
    }
  }

  /**
   * Generate personal book collection for user
   */
  async getPersonalCollection(userId: number, limit: number = 5): Promise<Result<PersonalCollectionResult, Error>> {
    try {
      // Try smart recommendations first
      const { getSmartRecommendations } = await import('../database/recommendationFunctions');
      let collection = await getSmartRecommendations(userId, limit);

      if (collection.length > 0) {
        return ok({
          books: collection,
          source: 'smart_recommendations',
          count: collection.length,
        });
      }

      // Fallback to top books
      const { getTopBooks } = await import('../database/models');
      const topBooks = await getTopBooks(Math.min(limit, 3));

      if (topBooks.length > 0) {
        return ok({
          books: topBooks,
          source: 'top_books',
          count: topBooks.length,
        });
      }

      // Final fallback to newest books
      const { getNewestBooks } = await import('../database/models');
      const newBooks = await getNewestBooks(Math.min(limit, 3));

      return ok({
        books: newBooks,
        source: 'new_books',
        count: newBooks.length,
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to get personal collection', errMsg, { userId, limit });
      return err(errMsg);
    }
  }

  /**
   * Get user's favorite genres based on saved books and reviews
   */
  async getUserFavoriteGenres(userId: number): Promise<Result<string[], Error>> {
    try {
      const { getSavedBooks } = await import('../database/models');
      const savedBooks = await getSavedBooks(userId);

      const genres = new Set<string>();
      savedBooks.forEach((book) => {
        if (book.genre) {
          genres.add(book.genre);
        }
      });

      return ok(Array.from(genres));
    } catch (error) {
      const errMsg = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to get user favorite genres', errMsg, { userId });
      return err(errMsg);
    }
  }

  /**
   * Get user's interest tags based on saved books
   */
  async getUserInterestTags(userId: number): Promise<Result<string[], Error>> {
    try {
      const { getSavedBooks } = await import('../database/models');
      const { getBookTags } = await import('../database/tagFunctions');
      const savedBooks = await getSavedBooks(userId);

      const tags = new Set<string>();
      for (const book of savedBooks) {
        const bookTags = await getBookTags(book.id!);
        bookTags.forEach((tag) => tags.add(tag.name));
      }

      return ok(Array.from(tags));
    } catch (error) {
      const errMsg = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to get user interest tags', errMsg, { userId });
      return err(errMsg);
    }
  }

  /**
   * Check if user can perform certain actions (rate limiting, permissions)
   */
  async canUserPerformAction(userId: number, action: string): Promise<Result<boolean, Error>> {
    try {
      // Basic implementation - can be extended with rate limiting logic
      // For now, always allow actions
      return ok(true);
    } catch (error) {
      const errMsg = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to check user action permission', errMsg, { userId, action });
      return err(errMsg);
    }
  }

  /**
   * Format user profile text for display
   */
  formatProfileText(profile: UserProfile): string {
    let profileText = '<b>👤 Ваш профіль</b>\n\n';
    profileText += `🆔 ID: ${profile.userId}\n`;
    profileText += `👤 Ім'я: ${profile.firstName} ${profile.lastName}\n`;
    profileText += `🔖 Username: ${profile.username}\n\n`;
    profileText += '<b>📊 Статистика</b>\n';
    profileText += `💾 Збережених книг: ${profile.stats.savedBooksCount}\n`;
    profileText += `⭐ Залишено відгуків: ${profile.stats.reviewsCount}\n`;

    // Listening time
    const hours = Math.floor(profile.stats.totalListeningTime / 3600);
    const minutes = Math.floor((profile.stats.totalListeningTime % 3600) / 60);
    profileText += `🎧 Прослухано: ${hours}г ${minutes}хв\n`;

    // Favorite genres
    if (profile.favoriteGenres.length > 0) {
      profileText += '\n<b>📚 Улюблені жанри:</b>\n';
      profile.favoriteGenres.slice(0, 5).forEach((genre, i) => {
        profileText += `${i + 1}. ${genre}\n`;
      });
    } else {
      profileText += '\n<i>📚 Улюблені жанри ще не встановлені</i>\n';
    }

    // User tags
    if (profile.userTags.length > 0) {
      profileText += '\n<b>🏷️ Ваші інтереси (теги):</b>\n';
      const tagsArray = profile.userTags.slice(0, LIMITS.TAGS_LIMIT);
      profileText += tagsArray.map((tag) => `#${tag}`).join(' ') + '\n';
    }

    profileText += '\n<i>💡 Продовжуйте читати та залишати відгуки!</i>';

    return profileText;
  }

  /**
   * Format detailed statistics text
   */
  formatDetailedStatsText(stats: UserStats): string {
    const hours = Math.floor(stats.totalListeningTime / 3600);
    const minutes = Math.floor((stats.totalListeningTime % 3600) / 60);

    let statsText = '📊 <b>Ваша детальна статистика</b>\n\n';
    statsText += `💾 Збережено книг: ${stats.savedBooksCount}\n`;
    statsText += `⭐ Залишено відгуків: ${stats.reviewsCount}\n`;
    statsText += `🎧 Прослухано: ${hours}г ${minutes}хв\n\n`;

    if (stats.favoriteGenres.length > 0) {
      statsText += '📚 *Улюблені жанри:*\n';
      stats.favoriteGenres.forEach((genre, index) => {
        statsText += `${index + 1}. ${genre}\n`;
      });
      statsText += '\n';
    } else {
      statsText += '📚 *Улюблені жанри:* не встановлені\n\n';
    }

    statsText += '💡 Продовжуйте читати та слухати!';

    return statsText;
  }
}

/**
 * Create a new UserManagementService instance
 * @param db - Database connection
 * @returns UserManagementService instance
 */
export function createUserManagementService(db: any): UserManagementService {
  return new UserManagementService(db);
}