import { db } from '../database/models';
import { DeviceType } from '../keyboards/mainKeyboards';
import { logger } from './logger';

export const getUserKeyboardPreference = (userId: number): DeviceType => {
  try {
    const result = db
      .prepare(
        `
      SELECT keyboard_type FROM users WHERE user_id = ?
    `
      )
      .get(userId) as { keyboard_type?: string } | undefined;

    if (result && result.keyboard_type) {
      return result.keyboard_type as DeviceType;
    }

    return 'mobile';
  } catch (error) {
    logger.error(
      'Error getting keyboard preference',
      error instanceof Error ? error : new Error(String(error))
    );
    return 'mobile';
  }
};

export const setUserKeyboardPreference = (userId: number, deviceType: DeviceType): boolean => {
  try {
    const user = db
      .prepare(
        `
      SELECT id FROM users WHERE user_id = ?
    `
      )
      .get(userId);

    if (!user) {
      db.prepare(
        `
        INSERT INTO users (user_id, keyboard_type, created_at)
        VALUES (?, ?, datetime('now'))
      `
      ).run(userId, deviceType);
    } else {
      db.prepare(
        `
        UPDATE users SET keyboard_type = ? WHERE user_id = ?
      `
      ).run(deviceType, userId);
    }

    logger.info('Keyboard preference updated', { userId, deviceType });
    return true;
  } catch (error) {
    logger.error(
      'Error setting keyboard preference',
      error instanceof Error ? error : new Error(String(error))
    );
    return false;
  }
};

export const ensureKeyboardTypeColumn = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      db.all('PRAGMA table_info(users)', [], (err, columns: Array<{ name: string }>) => {
        if (err) {
          logger.error('Error checking keyboard_type column', err);
          resolve();
          return;
        }

        const hasKeyboardType = columns.some((col) => col.name === 'keyboard_type');

        if (!hasKeyboardType) {
          db.run(
            `
            ALTER TABLE users ADD COLUMN keyboard_type TEXT DEFAULT 'mobile'
          `,
            [],
            (err) => {
              if (err) {
                logger.error('Error adding keyboard_type column', err);
              } else {
                logger.info('Added keyboard_type column to users table');
              }
              resolve();
            }
          );
        } else {
          resolve();
        }
      });
    } catch (error) {
      logger.error(
        'Error ensuring keyboard_type column',
        error instanceof Error ? error : new Error(String(error))
      );
      resolve();
    }
  });
};
