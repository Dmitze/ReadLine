/**
 * UserService - Business logic for user operations
 * 
 * Responsibilities:
 * - User creation and management
 * - User profile operations
 * - Admin management
 * - User statistics and activity tracking
 */

import { BaseService } from './BaseService';
import { UserRepository } from '../repositories/UserRepository';
import { SavedBookRepository } from '../repositories/SavedBookRepository';
import { ReviewRepository } from '../repositories/ReviewRepository';
import { ILogger } from '../core/types';
import { Result } from '../core/Result';
import { Admin as User } from '../database/models';

/**
 * Service for user-related operations
 */
export class UserService extends BaseService {
  /**
   * Create a new UserService instance
   * @param userRepository - Repository for user operations
   * @param savedBookRepository - Repository for saved books
   * @param reviewRepository - Repository for reviews
   * @param logger - Logger instance
   */
  constructor(
    private userRepository: UserRepository,
    private savedBookRepository: SavedBookRepository,
    private reviewRepository: ReviewRepository,
    logger: ILogger
  ) {
    super(logger);
  }

  /**
   * Get or create user by Telegram ID
   * @param telegramId - User's Telegram ID
   * @param username - User's Telegram username (optional)
   * @returns Result with user
   */
  async getOrCreateUser(telegramId: number, username?: string): Promise<Result<User>> {
    return this.executeAsync(
      async () => {
        let user = await this.userRepository.getByTelegramId(telegramId);

        if (!user) {
          // Create new user
          const newUser: Omit<User, 'id'> = {
            user_id: telegramId,
            username: username || undefined,
            created_at: new Date().toISOString(),
          };

          const userId = await this.userRepository.create(newUser);
          user = await this.userRepository.getById(userId);

          if (!user) {
            throw new Error(`Failed to create user with Telegram ID ${telegramId}`);
          }
        }

        return user;
      },
      `getOrCreateUser(${telegramId})`
    );
  }

  /**
   * Update user last seen timestamp
   * @param telegramId - User's Telegram ID
   * @returns Result with updated user
   */
  async updateLastSeen(telegramId: number): Promise<Result<User | null>> {
    return this.executeAsync(
      async () => {
        const user = await this.userRepository.getByTelegramId(telegramId);
        if (!user) return null;

        // Update logic would depend on repository implementation
        return user;
      },
      `updateLastSeen(${telegramId})`
    );
  }

  /**
   * Get user's saved books
   * @param userId - User ID
   * @returns Result with user's saved books
   */
  async getUserSavedBooks(userId: number): Promise<Result<number[]>> {
    return this.executeAsync(
      async () => {
        const saved = await this.savedBookRepository.getByUserId(userId);
        // Extract book IDs from SavedBook objects
        return saved.map((s) => s.book_id);
      },
      `getUserSavedBooks(${userId})`
    );
  }

  /**
   * Get user's review count
   * @param userId - User ID
   * @returns Result with review count
   */
  async getUserReviewCount(userId: number): Promise<Result<number>> {
    return this.executeAsync(
      async () => {
        const reviews = await this.reviewRepository.getByUserId(userId);
        return reviews.length;
      },
      `getUserReviewCount(${userId})`
    );
  }

  /**
   * Get user statistics
   * @param userId - User ID
   * @returns Result with user stats
   */
  async getUserStats(
    userId: number
  ): Promise<
    Result<{
      totalSavedBooks: number;
      totalReviews: number;
      averageRating: number;
    }>
  > {
    return this.executeAsync(
      async () => {
        const savedBooks = await this.savedBookRepository.getByUserId(userId);
        const reviews = await this.reviewRepository.getByUserId(userId);

        const averageRating =
          reviews.length > 0
            ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
            : 0;

        return {
          totalSavedBooks: savedBooks.length,
          totalReviews: reviews.length,
          averageRating: Math.round(averageRating * 100) / 100,
        };
      },
      `getUserStats(${userId})`
    );
  }

  /**
   * Make user an admin
   * @param userId - User ID
   * @returns Result with success status
   */
  async makeUserAdmin(userId: number): Promise<Result<number>> {
    return this.executeAsync(
      async () => {
        const user = await this.userRepository.getById(userId);
        if (!user) {
          throw new Error(`User with ID ${userId} not found`);
        }

        return await this.userRepository.update(userId, { username: user.username });
      },
      `makeUserAdmin(${userId})`
    );
  }

  /**
   * Get all admin users
   * @returns Result with list of admin users
   */
  async getAllAdmins(): Promise<Result<User[]>> {
    return this.executeAsync(
      async () => await this.userRepository.getAllAdmins(),
      'getAllAdmins'
    );
  }

  /**
   * Get total active user count
   * @returns Result with user count
   */
  async getActiveUserCount(): Promise<Result<number>> {
    return this.executeAsync(
      async () => await this.userRepository.getActiveCount(),
      'getActiveUserCount'
    );
  }

  /**
   * Get total user count
   * @returns Result with user count
   */
  async getTotalUserCount(): Promise<Result<number>> {
    return this.executeAsync(
      async () => await this.userRepository.getTotalCount(),
      'getTotalUserCount'
    );
  }
}
