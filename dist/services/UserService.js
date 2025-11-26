"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const Result_1 = require("../core/Result");
const logger_1 = require("../utils/logger");
class UserService {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }
    async getOrCreateUser(telegramId, input) {
        try {
            let user = await this.userRepository.findByTelegramId(telegramId);
            if (!user && input) {
                const userId = await this.userRepository.insert({
                    user_id: input.telegram_id,
                    username: input.username,
                    first_name: input.first_name,
                    last_name: input.last_name,
                    language_code: input.language || 'uk',
                    is_admin: false,
                });
                user = await this.userRepository.findById(userId);
            }
            if (!user) {
                return new Result_1.Err(new Error(`User with telegram_id ${telegramId} not found`));
            }
            return new Result_1.Ok(user);
        }
        catch (error) {
            return new Result_1.Err(error instanceof Error ? error : new Error('Failed to get or create user'));
        }
    }
    async getUserById(userId) {
        try {
            const user = await this.userRepository.findById(userId);
            if (!user) {
                return new Result_1.Err(new Error(`User with id ${userId} not found`));
            }
            return new Result_1.Ok(user);
        }
        catch (error) {
            return new Result_1.Err(error instanceof Error ? error : new Error('Failed to fetch user'));
        }
    }
    async getUserByTelegramId(telegramId) {
        try {
            const user = await this.userRepository.findByTelegramId(telegramId);
            if (!user) {
                return new Result_1.Err(new Error(`User with telegram_id ${telegramId} not found`));
            }
            return new Result_1.Ok(user);
        }
        catch (error) {
            return new Result_1.Err(error instanceof Error ? error : new Error('Failed to fetch user'));
        }
    }
    async updateUser(userId, input) {
        try {
            const user = await this.userRepository.findById(userId);
            if (!user) {
                return new Result_1.Err(new Error(`User with id ${userId} not found`));
            }
            await this.userRepository.update(userId, {
                username: input.username || user.username,
                first_name: input.first_name || user.first_name,
                last_name: input.last_name || user.last_name,
                is_admin: input.is_admin !== undefined ? input.is_admin : user.is_admin,
            });
            return new Result_1.Ok(undefined);
        }
        catch (error) {
            return new Result_1.Err(error instanceof Error ? error : new Error('Failed to update user'));
        }
    }
    async promoteToAdmin(userId) {
        try {
            const user = await this.userRepository.findById(userId);
            if (!user) {
                return new Result_1.Err(new Error(`User with id ${userId} not found`));
            }
            if (user.is_admin) {
                return new Result_1.Err(new Error('User is already an admin'));
            }
            await this.userRepository.update(userId, { is_admin: true });
            return new Result_1.Ok(undefined);
        }
        catch (error) {
            return new Result_1.Err(error instanceof Error ? error : new Error('Failed to promote user'));
        }
    }
    async revokeAdmin(userId) {
        try {
            const user = await this.userRepository.findById(userId);
            if (!user) {
                return new Result_1.Err(new Error(`User with id ${userId} not found`));
            }
            if (!user.is_admin) {
                return new Result_1.Err(new Error('User is not an admin'));
            }
            await this.userRepository.update(userId, { is_admin: false });
            return new Result_1.Ok(undefined);
        }
        catch (error) {
            return new Result_1.Err(error instanceof Error ? error : new Error('Failed to revoke admin'));
        }
    }
    async getAllAdmins() {
        try {
            const admins = await this.userRepository.findAdmins();
            return new Result_1.Ok(admins);
        }
        catch (error) {
            return new Result_1.Err(error instanceof Error ? error : new Error('Failed to fetch admins'));
        }
    }
    async getUserCount() {
        try {
            const count = await this.userRepository.count();
            return new Result_1.Ok(count);
        }
        catch (error) {
            return new Result_1.Err(error instanceof Error ? error : new Error('Failed to count users'));
        }
    }
    async getUserLanguage(userId) {
        try {
            const user = await this.userRepository.findById(userId);
            if (!user) {
                return new Result_1.Err(new Error(`User with id ${userId} not found`));
            }
            return new Result_1.Ok('uk');
        }
        catch (error) {
            return new Result_1.Err(error instanceof Error ? error : new Error('Failed to fetch user language'));
        }
    }
    async setUserLanguage(userId, language) {
        try {
            const user = await this.userRepository.findById(userId);
            if (!user) {
                return new Result_1.Err(new Error(`User with id ${userId} not found`));
            }
            await this.userRepository.update(userId, { language_code: language });
            logger_1.logger.info('User language updated', { userId, language });
            return new Result_1.Ok(undefined);
        }
        catch (error) {
            return new Result_1.Err(error instanceof Error ? error : new Error('Failed to set user language'));
        }
    }
}
exports.UserService = UserService;
//# sourceMappingURL=UserService.js.map