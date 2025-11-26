"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stopNotificationScheduler = exports.startNotificationScheduler = exports.sendNotification = exports.getPersonalizedNotification = exports.shouldSendNotification = exports.updateLastNotificationTime = exports.setUserNotificationSettings = exports.getUserNotificationSettings = void 0;
const models_1 = require("../database/models");
const logger_1 = require("./logger");
const getUserNotificationSettings = (userId) => {
    return new Promise((resolve, reject) => {
        models_1.db.get(`
      SELECT 
        user_id as userId,
        notification_frequency as frequency,
        notifications_enabled as enabled,
        last_notification_at as lastNotificationAt,
        notification_time as preferredTime
      FROM users 
      WHERE user_id = ?
    `, [userId], (err, result) => {
            if (err) {
                reject(err);
                return;
            }
            if (result) {
                resolve({
                    userId: result.userId,
                    frequency: result.frequency || 'weekly',
                    enabled: result.enabled !== false,
                    lastNotificationAt: result.lastNotificationAt
                        ? new Date(result.lastNotificationAt)
                        : undefined,
                    preferredTime: result.preferredTime || '10:00',
                });
            }
            else {
                resolve({
                    userId,
                    frequency: 'weekly',
                    enabled: true,
                    preferredTime: '10:00',
                });
            }
        });
    });
};
exports.getUserNotificationSettings = getUserNotificationSettings;
const setUserNotificationSettings = (settings) => {
    return new Promise((resolve) => {
        models_1.db.run(`
      UPDATE users 
      SET 
        notification_frequency = ?,
        notifications_enabled = ?,
        notification_time = ?
      WHERE user_id = ?
    `, [
            settings.frequency,
            settings.enabled ? 1 : 0,
            settings.preferredTime || '10:00',
            settings.userId,
        ], (err) => {
            if (err) {
                logger_1.logger.error('Error setting notification settings', err);
                resolve(false);
            }
            else {
                logger_1.logger.info('Notification settings updated', {
                    userId: settings.userId,
                    frequency: settings.frequency,
                });
                resolve(true);
            }
        });
    });
};
exports.setUserNotificationSettings = setUserNotificationSettings;
const updateLastNotificationTime = (userId) => {
    return new Promise((resolve) => {
        models_1.db.run(`
      UPDATE users 
      SET last_notification_at = datetime('now')
      WHERE user_id = ?
    `, [userId], (err) => {
            if (err) {
                logger_1.logger.error('Error updating last notification time', err);
            }
            resolve();
        });
    });
};
exports.updateLastNotificationTime = updateLastNotificationTime;
const shouldSendNotification = async (userId) => {
    const settings = await (0, exports.getUserNotificationSettings)(userId);
    if (!settings.enabled || settings.frequency === 'disabled') {
        return false;
    }
    if (!settings.lastNotificationAt) {
        return true;
    }
    const now = new Date();
    const lastNotification = new Date(settings.lastNotificationAt);
    const hoursSinceLastNotification = (now.getTime() - lastNotification.getTime()) / (1000 * 60 * 60);
    switch (settings.frequency) {
        case 'daily':
            return hoursSinceLastNotification >= 24;
        case 'every_4_days':
            return hoursSinceLastNotification >= 96;
        case 'weekly':
            return hoursSinceLastNotification >= 168;
        default:
            return false;
    }
};
exports.shouldSendNotification = shouldSendNotification;
const getPersonalizedNotification = async (userId) => {
    try {
        const user = await new Promise((resolve, reject) => {
            models_1.db.get(`
        SELECT 
          first_name,
          favorite_genres,
          last_active_at
        FROM users 
        WHERE user_id = ?
      `, [userId], (err, row) => {
                if (err)
                    reject(err);
                else
                    resolve(row);
            });
        });
        if (!user)
            return null;
        const firstName = user.first_name || 'Друже';
        let favoriteGenres = [];
        if (user.favorite_genres) {
            try {
                const parsed = JSON.parse(user.favorite_genres);
                favoriteGenres = Array.isArray(parsed) ? parsed : [];
            }
            catch {
                favoriteGenres = [];
            }
        }
        const lastActive = user.last_active_at ? new Date(user.last_active_at) : null;
        if (favoriteGenres.length > 0) {
            const NEW_BOOKS_DAYS = 7;
            const newBooks = await new Promise((resolve, reject) => {
                models_1.db.get(`
          SELECT COUNT(*) as count
          FROM books
          WHERE genre IN (${favoriteGenres.map(() => '?').join(',')})
          AND created_at > datetime('now', '-${NEW_BOOKS_DAYS} days')
          AND is_available = 1
        `, favoriteGenres, (err, row) => {
                    if (err)
                        reject(err);
                    else
                        resolve(row);
                });
            });
            if (newBooks && newBooks.count > 0) {
                return (`👋 Привіт, ${firstName}!\n\n` +
                    `📚 Є новинка! Додано ${newBooks.count} ${newBooks.count === 1 ? 'нова книга' : 'нові книги'} в твоїх улюблених жанрах.\n\n` +
                    'Хочеш подивитися? 👀');
            }
        }
        const unfinishedAudio = await new Promise((resolve, reject) => {
            models_1.db.get(`
        SELECT b.title
        FROM saved_books sb
        JOIN books b ON sb.book_id = b.id
        WHERE sb.user_id = ?
        AND b.audio_file_id IS NOT NULL
        LIMIT 1
      `, [userId], (err, row) => {
                if (err)
                    reject(err);
                else
                    resolve(row);
            });
        });
        if (unfinishedAudio && unfinishedAudio.title) {
            return (`👋 Привіт, ${firstName}!\n\n` +
                `🎧 Ти почав слухати "${unfinishedAudio.title}".\n\n` +
                'Продовжимо? 🎵');
        }
        const DAYS_INACTIVE_THRESHOLD = 7;
        const MS_PER_DAY = 1000 * 60 * 60 * 24;
        const daysSinceLastActive = lastActive
            ? Math.floor((Date.now() - lastActive.getTime()) / MS_PER_DAY)
            : 0;
        if (daysSinceLastActive > DAYS_INACTIVE_THRESHOLD) {
            return (`👋 Давно не бачилися, ${firstName}!\n\n` +
                '📚 У нас є багато цікавих книг.\n' +
                'Може час знайти щось нове для читання? 📖');
        }
        const topBooks = await new Promise((resolve, reject) => {
            models_1.db.get(`
        SELECT COUNT(*) as count
        FROM books
        WHERE is_available = 1
        AND created_at > datetime('now', '-30 days')
        ORDER BY rating DESC
        LIMIT 1
      `, [], (err, row) => {
                if (err)
                    reject(err);
                else
                    resolve(row);
            });
        });
        if (topBooks && topBooks.count > 0) {
            return (`⭐ ${firstName}, погляньте на це!\n\n` +
                '🏆 У нас з\'явилися найкраще оцінені книги цього місяця.\n\n' +
                'Вже читаєш щось круте? 🔥');
        }
        const booksReadThisWeek = await new Promise((resolve, reject) => {
            models_1.db.get(`
        SELECT COUNT(*) as count
        FROM saved_books
        WHERE user_id = ?
        AND created_at > datetime('now', '-7 days')
      `, [userId], (err, row) => {
                if (err)
                    reject(err);
                else
                    resolve(row);
            });
        });
        if (booksReadThisWeek && booksReadThisWeek.count === 0) {
            return (`💪 Привіт, ${firstName}!\n\n` +
                '📖 Ти не читав цього тижня.\n\n' +
                'Кожна сторінка - це нова історія. Почнемо? ✨');
        }
        return null;
    }
    catch (error) {
        logger_1.logger.error('Error generating personalized notification', error instanceof Error ? error : new Error(String(error)));
        return null;
    }
};
exports.getPersonalizedNotification = getPersonalizedNotification;
const sendNotification = async (bot, userId) => {
    try {
        const message = await (0, exports.getPersonalizedNotification)(userId);
        if (!message) {
            return false;
        }
        await bot.telegram.sendMessage(userId, message, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '📖 Переглянути новинки', callback_data: 'view_new_books' }],
                    [{ text: '🎲 Випадкова книга', callback_data: 'random_book' }],
                    [{ text: '⚙️ Налаштування сповіщень', callback_data: 'notification_settings' }],
                ],
            },
        });
        await (0, exports.updateLastNotificationTime)(userId);
        logger_1.logger.info('Notification sent', { userId });
        return true;
    }
    catch (error) {
        logger_1.logger.error('Error sending notification', error instanceof Error ? error : new Error(String(error)), { userId });
        return false;
    }
};
exports.sendNotification = sendNotification;
const startNotificationScheduler = (bot) => {
    logger_1.logger.info('Starting notification scheduler');
    const interval = setInterval(async () => {
        try {
            const users = await new Promise((resolve, reject) => {
                models_1.db.all(`
          SELECT user_id as userId
          FROM users
          WHERE notifications_enabled = 1
          AND notification_frequency != 'disabled'
        `, [], (err, rows) => {
                    if (err)
                        reject(err);
                    else
                        resolve(rows || []);
                });
            });
            logger_1.logger.info(`Checking notifications for ${users.length} users`);
            const BATCH_SIZE = 10;
            const DELAY_BETWEEN_BATCHES = 2000;
            for (let i = 0; i < users.length; i += BATCH_SIZE) {
                const batch = users.slice(i, i + BATCH_SIZE);
                await Promise.allSettled(batch.map(async (user) => {
                    try {
                        if (await (0, exports.shouldSendNotification)(user.userId)) {
                            await (0, exports.sendNotification)(bot, user.userId);
                        }
                    }
                    catch (error) {
                        logger_1.logger.error('Error sending notification to user', error, { userId: user.userId });
                    }
                }));
                if (i + BATCH_SIZE < users.length) {
                    await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
                }
            }
        }
        catch (error) {
            logger_1.logger.error('Error in notification scheduler', error instanceof Error ? error : new Error(String(error)));
        }
    }, 60 * 60 * 1000);
    return interval;
};
exports.startNotificationScheduler = startNotificationScheduler;
const stopNotificationScheduler = (interval) => {
    clearInterval(interval);
    logger_1.logger.info('Notification scheduler stopped');
};
exports.stopNotificationScheduler = stopNotificationScheduler;
//# sourceMappingURL=notifications.js.map