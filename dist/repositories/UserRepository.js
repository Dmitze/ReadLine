"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const BaseRepository_1 = require("./BaseRepository");
const logger_1 = require("../utils/logger");
class UserRepository extends BaseRepository_1.BaseRepository {
    constructor(db) {
        super(db, 'users');
    }
    async create(userData) {
        try {
            const { user_id, username, first_name, last_name, is_admin = false, is_new = true, } = userData;
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
            logger_1.logger.info(`User created: ${user_id}`, { id });
            return id;
        }
        catch (error) {
            logger_1.logger.error('Error creating user', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async getByTelegramId(userId) {
        try {
            const query = 'SELECT * FROM users WHERE user_id = ?';
            return await this.db.get(query, [userId]);
        }
        catch (error) {
            logger_1.logger.error('Error getting user by Telegram ID', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async update(userId, updates) {
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
            const validUpdates = {};
            for (const [key, value] of Object.entries(updates)) {
                if (allowedFields.includes(key)) {
                    validUpdates[key] = value;
                }
                else {
                    logger_1.logger.warn(`Attempted to update forbidden field: ${key}`, { userId });
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
                logger_1.logger.info(`User updated: ${userId}`, { changes, fields: Object.keys(validUpdates) });
            }
            return changes;
        }
        catch (error) {
            logger_1.logger.error('Error updating user', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async isNew(userId) {
        try {
            const user = await this.getByTelegramId(userId);
            return user?.is_new === true;
        }
        catch (error) {
            logger_1.logger.error('Error checking if user is new', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async markAsNotNew(userId) {
        try {
            const query = 'UPDATE users SET is_new = 0 WHERE user_id = ?';
            return await this.db.update(query, [userId]);
        }
        catch (error) {
            logger_1.logger.error('Error marking user as not new', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async updateLastSeen(userId) {
        try {
            const query = 'UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE user_id = ?';
            return await this.db.update(query, [userId]);
        }
        catch (error) {
            logger_1.logger.error('Error updating last seen', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async getAllAdmins() {
        try {
            const query = 'SELECT * FROM users WHERE is_admin = 1 ORDER BY created_at DESC';
            return await this.db.all(query, []);
        }
        catch (error) {
            logger_1.logger.error('Error getting all admins', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async getTotalCount() {
        try {
            return await this.count();
        }
        catch (error) {
            logger_1.logger.error('Error getting total user count', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async getActiveCount(daysBack = 7) {
        try {
            const query = `
        SELECT COUNT(*) as count FROM users 
        WHERE last_seen >= datetime('now', '-' || ? || ' days')
      `;
            const result = await this.db.get(query, [daysBack]);
            return result?.count || 0;
        }
        catch (error) {
            logger_1.logger.error('Error getting active count', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async getNewSince(date) {
        try {
            const query = `
        SELECT * FROM users 
        WHERE created_at >= ? 
        ORDER BY created_at DESC
      `;
            return await this.db.all(query, [date.toISOString()]);
        }
        catch (error) {
            logger_1.logger.error('Error getting new users', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async search(searchTerm, limit = 20) {
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
            return await this.db.all(query, [pattern, pattern, pattern, limit]);
        }
        catch (error) {
            logger_1.logger.error('Error searching users', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async findByTelegramId(userId) {
        return this.getByTelegramId(userId);
    }
    async findAdmins() {
        return this.getAllAdmins();
    }
}
exports.UserRepository = UserRepository;
//# sourceMappingURL=UserRepository.js.map