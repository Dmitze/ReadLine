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
export const getUserNotificationSettings = (userId: number): Promise<NotificationSettings> => {
  return new Promise((resolve, reject) => {
    db.get(`
      SELECT 
        user_id as userId,
        notification_frequency as frequency,
        notifications_enabled as enabled,
        last_notification_at as lastNotificationAt,
        notification_time as preferredTime
      FROM users 
      WHERE user_id = ?
    `, [userId], (err, result: NotificationSettings | undefined) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (result) {
        resolve({
          userId: result.userId,
          frequency: result.frequency || 'weekly',
          enabled: result.enabled !== false,
          lastNotificationAt: result.lastNotificationAt ? new Date(result.lastNotificationAt) : undefined,
          preferredTime: result.preferredTime || '10:00'
        });
      } else {
        // За замовчуванням
        resolve({
          userId,
          frequency: 'weekly',
          enabled: true,
          preferredTime: '10:00'
        });
      }
    });
  });
};

// Зберегти налаштування сповіщень
export const setUserNotificationSettings = (settings: NotificationSettings): Promise<boolean> => {
  return new Promise((resolve) => {
    db.run(`
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
      settings.userId
    ], (err) => {
      if (err) {
        logger.error('Error setting notification settings', err);
        resolve(false);
      } else {
        logger.info('Notification settings updated', { userId: settings.userId, frequency: settings.frequency });
        resolve(true);
      }
    });
  });
};

// Оновити час останнього сповіщення
export const updateLastNotificationTime = (userId: number): Promise<void> => {
  return new Promise((resolve) => {
    db.run(`
      UPDATE users 
      SET last_notification_at = datetime('now')
      WHERE user_id = ?
    `, [userId], (err) => {
      if (err) {
        logger.error('Error updating last notification time', err);
      }
      resolve();
    });
  });
};

// ============================================
// ПЕРЕВІРКА ЧИ ПОТРІБНО НАДІСЛАТИ СПОВІЩЕННЯ
// ============================================

// Перевірити чи потрібно надіслати сповіщення користувачу
export const shouldSendNotification = async (userId: number): Promise<boolean> => {
  // ✅ ВИПРАВЛЕНО: async функція
  const settings = await getUserNotificationSettings(userId);
  
  // Якщо сповіщення вимкнені
  if (!settings.enabled || settings.frequency === 'disabled') {
    return false;
  }
  
  // Якщо ще не було сповіщень
  if (!settings.lastNotificationAt) {
    return true;
  }
  
  const now = new Date();
  const lastNotification = new Date(settings.lastNotificationAt);
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
    // ✅ ВИПРАВЛЕНО: telegram_id → user_id та async API
    const user = await new Promise<any>((resolve, reject) => {
      db.get(`
        SELECT 
          first_name,
          favorite_genres,
          last_active_at
        FROM users 
        WHERE user_id = ?
      `, [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!user) return null;
     
     const firstName = user.first_name || 'Друже';
     // ✅ ВИПРАВЛЕНО #10: використовуємо JSON.parse як в userFunctions
     let favoriteGenres: string[] = [];
     if (user.favorite_genres) {
       try {
         const parsed = JSON.parse(user.favorite_genres);
         favoriteGenres = Array.isArray(parsed) ? parsed : [];
       } catch {
         // Якщо JSON parse не спрацює - це OK, просто пустий масив
         favoriteGenres = [];
       }
     }
     const lastActive = user.last_active_at ? new Date(user.last_active_at) : null;
    
    // Перевіряємо чи є нові книги в улюблених жанрах
    if (favoriteGenres.length > 0) {
      const NEW_BOOKS_DAYS = 7;
      const newBooks = await new Promise<{ count: number } | undefined>((resolve, reject) => {
        db.get(`
          SELECT COUNT(*) as count
          FROM books
          WHERE genre IN (${favoriteGenres.map(() => '?').join(',')})
          AND created_at > datetime('now', '-${NEW_BOOKS_DAYS} days')
          AND is_available = 1
        `, favoriteGenres, (err, row: { count: number } | undefined) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      if (newBooks && newBooks.count > 0) {
        return (
          `👋 Привіт, ${firstName}!\n\n` +
          `📚 Є новинка! Додано ${newBooks.count} ${newBooks.count === 1 ? 'нова книга' : 'нові книги'} в твоїх улюблених жанрах.\n\n` +
          'Хочеш подивитися? 👀'
        );
      }
    }
    
    // ✅ ВИПРАВЛЕНО: async API
    const unfinishedAudio = await new Promise<{ title?: string } | undefined>((resolve, reject) => {
      db.get(`
        SELECT b.title
        FROM saved_books sb
        JOIN books b ON sb.book_id = b.id
        WHERE sb.user_id = ?
        AND b.audio_file_id IS NOT NULL
        LIMIT 1
      `, [userId], (err, row: { title?: string } | undefined) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (unfinishedAudio && unfinishedAudio.title) {
      return (
        `👋 Привіт, ${firstName}!\n\n` +
        `🎧 Ти почав слухати "${unfinishedAudio.title}".\n\n` +
        'Продовжимо? 🎵'
      );
    }
    
    // Загальне нагадування
    const DAYS_INACTIVE_THRESHOLD = 7;
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    const daysSinceLastActive = lastActive 
      ? Math.floor((Date.now() - lastActive.getTime()) / MS_PER_DAY)
      : 0;
    
    if (daysSinceLastActive > DAYS_INACTIVE_THRESHOLD) {
      return (
        `👋 Давно не бачилися, ${firstName}!\n\n` +
        '📚 У нас є багато цікавих книг.\n' +
        'Може час знайти щось нове для читання? 📖'
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
    
    // ✅ ВИПРАВЛЕНО: await для async функції
    await updateLastNotificationTime(userId);
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
      // ✅ ВИПРАВЛЕНО: telegram_id → user_id
      const users = await new Promise<Array<{ userId: number }>>((resolve, reject) => {
        db.all(`
          SELECT user_id as userId
          FROM users
          WHERE notifications_enabled = 1
          AND notification_frequency != 'disabled'
        `, [], (err, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });
      
      logger.info(`Checking notifications for ${users.length} users`);
      
      // ✅ ВИПРАВЛЕНО #8: batch processing замість послідовного циклу для уникнення deadlock
      const BATCH_SIZE = 10;
      const DELAY_BETWEEN_BATCHES = 2000; // 2 секунди між батчами
      
      for (let i = 0; i < users.length; i += BATCH_SIZE) {
        const batch = users.slice(i, i + BATCH_SIZE);
        
        // Обробляємо батч паралельно
        await Promise.allSettled(
          batch.map(async (user) => {
            try {
              if (await shouldSendNotification(user.userId)) {
                await sendNotification(bot, user.userId);
              }
            } catch (error) {
              logger.error('Error sending notification to user', error, { userId: user.userId });
            }
          })
        );
        
        // Затримка між батчами
        if (i + BATCH_SIZE < users.length) {
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
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
