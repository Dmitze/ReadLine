// Система розумних нагадувань (Завдання 31)
import { Telegraf } from 'telegraf';
import { db } from '../database/models';
import { logger } from './logger';
import { BotContext } from '../types/telegraf';

// Типи частоти нагадувань
export type NotificationFrequency = 'daily' | 'every_4_days' | 'weekly' | 'disabled';

// Інтерфейс налаштувань сповіщень
export interface NotificationSettings {
  userId: number;
  frequency: NotificationFrequency;
  enabled: boolean;
  lastNotificationAt?: Date;
  preferredTime?: string; // Формат: "HH:MM"
}

// ============================================
// НАЛАШТУВАННЯ СПОВІЩЕНЬ
// ============================================

// Отримати налаштування сповіщень користувача
export const getUserNotificationSettings = (userId: number): NotificationSettings => {
  try {
    const result = db.prepare(`
      SELECT 
        telegram_id as userId,
        notification_frequency as frequency,
        notifications_enabled as enabled,
        last_notification_at as lastNotificationAt,
        notification_time as preferredTime
      FROM users 
      WHERE telegram_id = ?
    `).get(userId) as any;
    
    if (result) {
      return {
        userId: result.userId,
        frequency: result.frequency || 'weekly',
        enabled: result.enabled !== 0,
        lastNotificationAt: result.lastNotificationAt ? new Date(result.lastNotificationAt) : undefined,
        preferredTime: result.preferredTime || '10:00'
      };
    }
    
    // За замовчуванням
    return {
      userId,
      frequency: 'weekly',
      enabled: true,
      preferredTime: '10:00'
    };
  } catch (error) {
    logger.error('Error getting notification settings', error instanceof Error ? error : new Error(String(error)));
    return {
      userId,
      frequency: 'weekly',
      enabled: true,
      preferredTime: '10:00'
    };
  }
};

// Зберегти налаштування сповіщень
export const setUserNotificationSettings = (settings: NotificationSettings): boolean => {
  try {
    db.prepare(`
      UPDATE users 
      SET 
        notification_frequency = ?,
        notifications_enabled = ?,
        notification_time = ?
      WHERE telegram_id = ?
    `).run(
      settings.frequency,
      settings.enabled ? 1 : 0,
      settings.preferredTime || '10:00',
      settings.userId
    );
    
    logger.info('Notification settings updated', { userId: settings.userId, frequency: settings.frequency });
    return true;
  } catch (error) {
    logger.error('Error setting notification settings', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
};

// Оновити час останнього сповіщення
export const updateLastNotificationTime = (userId: number): void => {
  try {
    db.prepare(`
      UPDATE users 
      SET last_notification_at = datetime('now')
      WHERE telegram_id = ?
    `).run(userId);
  } catch (error) {
    logger.error('Error updating last notification time', error instanceof Error ? error : new Error(String(error)));
  }
};

// ============================================
// ПЕРЕВІРКА ЧИ ПОТРІБНО НАДІСЛАТИ СПОВІЩЕННЯ
// ============================================

// Перевірити чи потрібно надіслати сповіщення користувачу
export const shouldSendNotification = (userId: number): boolean => {
  const settings = getUserNotificationSettings(userId);
  
  // Якщо сповіщення вимкнені
  if (!settings.enabled || settings.frequency === 'disabled') {
    return false;
  }
  
  // Якщо ще не було сповіщень
  if (!settings.lastNotificationAt) {
    return true;
  }
  
  const now = new Date();
  const lastNotification = settings.lastNotificationAt;
  const hoursSinceLastNotification = (now.getTime() - lastNotification.getTime()) / (1000 * 60 * 60);
  
  // Перевіряємо частоту
  switch (settings.frequency) {
    case 'daily':
      return hoursSinceLastNotification >= 24;
    case 'every_4_days':
      return hoursSinceLastNotification >= 96; // 4 * 24
    case 'weekly':
      return hoursSinceLastNotification >= 168; // 7 * 24
    default:
      return false;
  }
};

// ============================================
// ГЕНЕРАЦІЯ ПЕРСОНАЛІЗОВАНИХ ПОВІДОМЛЕНЬ
// ============================================

// Отримати персоналізоване повідомлення для користувача
export const getPersonalizedNotification = async (userId: number): Promise<string | null> => {
  try {
    // Отримуємо інформацію про користувача
    const user = db.prepare(`
      SELECT 
        first_name,
        favorite_genres,
        last_active_at
      FROM users 
      WHERE telegram_id = ?
    `).get(userId) as any;
    
    if (!user) return null;
    
    const firstName = user.first_name || 'Друже';
    const favoriteGenres = user.favorite_genres ? user.favorite_genres.split(',') : [];
    const lastActive = user.last_active_at ? new Date(user.last_active_at) : null;
    
    // Перевіряємо чи є нові книги в улюблених жанрах
    if (favoriteGenres.length > 0) {
      const newBooks = await new Promise<{ count: number } | undefined>((resolve, reject) => {
        db.get(`
          SELECT COUNT(*) as count
          FROM books
          WHERE genre IN (${favoriteGenres.map(() => '?').join(',')})
          AND created_at > datetime('now', '-7 days')
          AND is_available = 1
        `, favoriteGenres, (err, row: any) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      if (newBooks && newBooks.count > 0) {
        return (
          `👋 Привіт, ${firstName}!\n\n` +
          `📚 Є новинка! Додано ${newBooks.count} ${newBooks.count === 1 ? 'нова книга' : 'нові книги'} в твоїх улюблених жанрах.\n\n` +
          `Хочеш подивитися? 👀`
        );
      }
    }
    
    // Перевіряємо чи є незавершені аудіокниги
    const unfinishedAudio = db.prepare(`
      SELECT b.title
      FROM saved_books sb
      JOIN books b ON sb.book_id = b.id
      WHERE sb.user_id = ?
      AND b.audio_file_id IS NOT NULL
      LIMIT 1
    `).get(userId) as { title?: string } | undefined;
    
    if (unfinishedAudio && unfinishedAudio.title) {
      return (
        `👋 Привіт, ${firstName}!\n\n` +
        `🎧 Ти почав слухати "${unfinishedAudio.title}".\n\n` +
        `Продовжимо? 🎵`
      );
    }
    
    // Загальне нагадування
    const daysSinceLastActive = lastActive 
      ? Math.floor((Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    
    if (daysSinceLastActive > 7) {
      return (
        `👋 Давно не бачилися, ${firstName}!\n\n` +
        `📚 У нас є багато цікавих книг.\n` +
        `Може час знайти щось нове для читання? 📖`
      );
    }
    
    // Якщо нічого особливого - не надсилаємо
    return null;
    
  } catch (error) {
    logger.error('Error generating personalized notification', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
};

// ============================================
// НАДСИЛАННЯ СПОВІЩЕНЬ
// ============================================

// Надіслати сповіщення користувачу
export const sendNotification = async (bot: Telegraf<BotContext>, userId: number): Promise<boolean> => {
  try {
    const message = await getPersonalizedNotification(userId);
    
    if (!message) {
      return false;
    }
    
    await bot.telegram.sendMessage(userId, message, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📖 Переглянути новинки', callback_data: 'view_new_books' }],
          [{ text: '🎲 Випадкова книга', callback_data: 'random_book' }],
          [{ text: '⚙️ Налаштування сповіщень', callback_data: 'notification_settings' }]
        ]
      }
    });
    
    updateLastNotificationTime(userId);
    logger.info('Notification sent', { userId });
    return true;
    
  } catch (error) {
    logger.error('Error sending notification', error instanceof Error ? error : new Error(String(error)), { userId });
    return false;
  }
};

// ============================================
// ПЛАНУВАЛЬНИК СПОВІЩЕНЬ
// ============================================

// Запустити планувальник сповіщень
export const startNotificationScheduler = (bot: Telegraf<BotContext>): NodeJS.Timeout => {
  logger.info('Starting notification scheduler');
  
  // Перевіряємо кожну годину
  const interval = setInterval(async () => {
    try {
      // Отримуємо всіх користувачів з увімкненими сповіщеннями
      const users = await new Promise<Array<{ userId: number }>>((resolve, reject) => {
        db.all(`
          SELECT telegram_id as userId
          FROM users
          WHERE notifications_enabled = 1
          AND notification_frequency != 'disabled'
        `, [], (err, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });
      
      logger.info(`Checking notifications for ${users.length} users`);
      
      for (const user of users) {
        if (shouldSendNotification(user.userId)) {
          await sendNotification(bot, user.userId);
          // Затримка між сповіщеннями щоб не флудити
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } catch (error) {
      logger.error('Error in notification scheduler', error instanceof Error ? error : new Error(String(error)));
    }
  }, 60 * 60 * 1000); // Кожну годину
  
  return interval;
};

// Зупинити планувальник сповіщень
export const stopNotificationScheduler = (interval: NodeJS.Timeout): void => {
  clearInterval(interval);
  logger.info('Notification scheduler stopped');
};
