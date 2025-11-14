/**
 * User Service - Бізнес-логіка для роботи з користувачами
 * REFACTOR-003: Service Layer
 */

import { UserRepository } from '../repositories/UserRepository';
import { Result, Ok, Err } from '../core/Result';

export interface CreateUserInput {
  telegram_id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  language?: string;
}

export interface UpdateUserInput {
  username?: string;
  first_name?: string;
  last_name?: string;
  language?: string;
  is_admin?: boolean;
}

export class UserService {
  constructor(private userRepository: UserRepository) {}

  /**
   * Отримати або створити користувача
   */
  async getOrCreateUser(telegramId: number, input?: CreateUserInput): Promise<Result<any>> {
    try {
      let user = await this.userRepository.findByTelegramId(telegramId);

      if (!user && input) {
        const userId = await this.userRepository.insert({
          telegram_id: input.telegram_id,
          username: input.username,
          first_name: input.first_name,
          last_name: input.last_name,
          language: input.language || 'uk',
          is_admin: false,
          created_at: new Date(),
          updated_at: new Date()
        });

        user = await this.userRepository.findById(userId);
      }

      if (!user) {
        return new Err(new Error(`User with telegram_id ${telegramId} not found`));
      }

      return new Ok(user);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to get or create user'));
    }
  }

  /**
   * Отримати користувача за ID
   */
  async getUserById(userId: number): Promise<Result<any>> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        return new Err(new Error(`User with id ${userId} not found`));
      }
      return new Ok(user);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to fetch user'));
    }
  }

  /**
   * Отримати користувача за Telegram ID
   */
  async getUserByTelegramId(telegramId: number): Promise<Result<any>> {
    try {
      const user = await this.userRepository.findByTelegramId(telegramId);
      if (!user) {
        return new Err(new Error(`User with telegram_id ${telegramId} not found`));
      }
      return new Ok(user);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to fetch user'));
    }
  }

  /**
   * Оновити користувача
   */
  async updateUser(userId: number, input: UpdateUserInput): Promise<Result<void>> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        return new Err(new Error(`User with id ${userId} not found`));
      }

      await this.userRepository.update(userId, {
        username: input.username || user.username,
        first_name: input.first_name || user.first_name,
        last_name: input.last_name || user.last_name,
        language: input.language || user.language,
        is_admin: input.is_admin !== undefined ? input.is_admin : user.is_admin,
        updated_at: new Date()
      });

      return new Ok(undefined);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to update user'));
    }
  }

  /**
   * Промоувати користувача в адміни
   */
  async promoteToAdmin(userId: number): Promise<Result<void>> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        return new Err(new Error(`User with id ${userId} not found`));
      }

      if (user.is_admin) {
        return new Err(new Error('User is already an admin'));
      }

      await this.userRepository.update(userId, { is_admin: true });
      return new Ok(undefined);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to promote user'));
    }
  }

  /**
   * Позбавити адмін прав
   */
  async revokeAdmin(userId: number): Promise<Result<void>> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        return new Err(new Error(`User with id ${userId} not found`));
      }

      if (!user.is_admin) {
        return new Err(new Error('User is not an admin'));
      }

      await this.userRepository.update(userId, { is_admin: false });
      return new Ok(undefined);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to revoke admin'));
    }
  }

  /**
   * Отримати всіх адмінів
   */
  async getAllAdmins(): Promise<Result<any[]>> {
    try {
      const admins = await this.userRepository.findAdmins();
      return new Ok(admins);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to fetch admins'));
    }
  }

  /**
   * Отримати кількість користувачів
   */
  async getUserCount(): Promise<Result<number>> {
    try {
      const count = await this.userRepository.count();
      return new Ok(count);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to count users'));
    }
  }

  /**
   * Отримати мову користувача
   */
  async getUserLanguage(userId: number): Promise<Result<string>> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        return new Err(new Error(`User with id ${userId} not found`));
      }
      return new Ok(user.language || 'uk');
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to fetch user language'));
    }
  }

  /**
   * Оновити мову користувача
   */
  async setUserLanguage(userId: number, language: string): Promise<Result<void>> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        return new Err(new Error(`User with id ${userId} not found`));
      }

      await this.userRepository.update(userId, { language });
      return new Ok(undefined);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to set user language'));
    }
  }
}
