import { DatabaseWrapper } from '../database/dbWrapper';
import { BaseRepository } from './BaseRepository';
import { logger } from '../utils/logger';

export interface User {
  id?: number;
  user_id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
  is_admin?: boolean;
  is_new?: boolean;
  created_at?: string;
  last_seen?: string;
}

export class UserRepository extends BaseRepository<User> {
  constructor(db: DatabaseWrapper) {
    super(db, 'users');
  }

  async create(userData: Omit<User, 'id' | 'created_at' | 'last_seen'>): Promise<number> {
    try {
      const {
        user_id,
        username,
        first_name,
        last_name,
        is_admin = false,
        is_new = true,
      } = userData;

      const query = `
        INSERT INTO users (user_id, username, first_name, last_name, is_admin, is_new)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      const id = await this.db.insert(query, [
        user_id,
        username || null,
        first_name || null,
        last_name || null,
        is_admin ? 1 : 0,
        is_new ? 1 : 0,
      ]);

      logger.info(`User created: ${user_id}`, { id });
      return id;
    } catch (error) {
      logger.error(
        'Error creating user',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  async getByTelegramId(userId: number): Promise<User | undefined> {
    try {
      const query = 'SELECT * FROM users WHERE user_id = ?';
      return await this.db.get<User>(query, [userId]);
    } catch (error) {
      logger.error(
        'Error getting user by Telegram ID',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  async update(
    userId: number,
    updates: Partial<Omit<User, 'id' | 'user_id' | 'created_at'>>
  ): Promise<number> {
    try {
      if (Object.keys(updates).length === 0) {
        return 0;
      }

      const allowedFields = [
        'username',
        'first_name',
        'last_name',
        'language_code',
        'is_admin',
        'is_new',
        'last_seen',
      ];

      const validUpdates: Record<string, any> = {};
      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          validUpdates[key] = value;
        } else {
          logger.warn(`Attempted to update forbidden field: ${key}`, { userId });
        }
      }

      if (Object.keys(validUpdates).length === 0) {
        return 0;
      }

      const fields = Object.keys(validUpdates)
        .map((key) => `"${key}" = ?`)
        .join(', ');
      const values = Object.values(validUpdates);

      const query = `UPDATE users SET ${fields} WHERE user_id = ?`;
      const changes = await this.db.update(query, [...values, userId]);

      if (changes > 0) {
        logger.info(`User updated: ${userId}`, { changes, fields: Object.keys(validUpdates) });
      }
      return changes;
    } catch (error) {
      logger.error(
        'Error updating user',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  async isNew(userId: number): Promise<boolean> {
    try {
      const user = await this.getByTelegramId(userId);
      return user?.is_new === true;
    } catch (error) {
      logger.error(
        'Error checking if user is new',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  async markAsNotNew(userId: number): Promise<number> {
    try {
      const query = 'UPDATE users SET is_new = 0 WHERE user_id = ?';
      return await this.db.update(query, [userId]);
    } catch (error) {
      logger.error(
        'Error marking user as not new',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  async updateLastSeen(userId: number): Promise<number> {
    try {
      const query = 'UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE user_id = ?';
      return await this.db.update(query, [userId]);
    } catch (error) {
      logger.error(
        'Error updating last seen',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  async getAllAdmins(): Promise<User[]> {
    try {
      const query = 'SELECT * FROM users WHERE is_admin = 1 ORDER BY created_at DESC';
      return await this.db.all<User>(query, []);
    } catch (error) {
      logger.error(
        'Error getting all admins',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  async getTotalCount(): Promise<number> {
    try {
      return await this.count();
    } catch (error) {
      logger.error(
        'Error getting total user count',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  async getActiveCount(daysBack: number = 7): Promise<number> {
    try {
      const query = `
        SELECT COUNT(*) as count FROM users 
        WHERE last_seen >= datetime('now', '-' || ? || ' days')
      `;
      const result = await this.db.get<{ count: number }>(query, [daysBack]);
      return result?.count || 0;
    } catch (error) {
      logger.error(
        'Error getting active count',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  async getNewSince(date: Date): Promise<User[]> {
    try {
      const query = `
        SELECT * FROM users 
        WHERE created_at >= ? 
        ORDER BY created_at DESC
      `;
      return await this.db.all<User>(query, [date.toISOString()]);
    } catch (error) {
      logger.error(
        'Error getting new users',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  async search(searchTerm: string, limit: number = 20): Promise<User[]> {
    try {
      const pattern = `%${searchTerm}%`;
      const query = `
        SELECT * FROM users
        WHERE username LIKE ? COLLATE NOCASE
           OR first_name LIKE ? COLLATE NOCASE
           OR last_name LIKE ? COLLATE NOCASE
        ORDER BY created_at DESC
        LIMIT ?
      `;
      return await this.db.all<User>(query, [pattern, pattern, pattern, limit]);
    } catch (error) {
      logger.error(
        'Error searching users',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  async findByTelegramId(userId: number): Promise<User | undefined> {
    return this.getByTelegramId(userId);
  }

  async findAdmins(): Promise<User[]> {
    return this.getAllAdmins();
  }
}
