/**
 * Автоматичний backup БД
 * ✅ ВИПРАВЛЕНО #70: автоматизований backup кожні 24 години
 */

import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';

const BACKUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 години
const MAX_BACKUPS = 7; // Зберігаємо останні 7 днів

/**
 * Створити backup БД
 */
export async function createBackup(): Promise<boolean> {
  try {
    logger.info('Starting database backup...');

    // Шлях до оригінальної БД
    const dbPath = process.env.DB_PATH || './database/library.db';
    const fullDbPath = path.resolve(dbPath);

    // Перевіряємо чи існує БД
    if (!fs.existsSync(fullDbPath)) {
      logger.error('Database file not found', { path: fullDbPath });
      return false;
    }

    // Створюємо папку для backup якщо не існує
    const backupDir = path.resolve('./backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Генеруємо ім'я файлу з timestamp
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .split('.')[0];

    const backupFileName = `library-backup-${timestamp}.db`;
    const backupPath = path.join(backupDir, backupFileName);

    // Копіюємо файл
    fs.copyFileSync(fullDbPath, backupPath);

    // Перевіряємо що копія створена успішно
    if (fs.existsSync(backupPath)) {
      const stats = fs.statSync(fullDbPath);
      const backupStats = fs.statSync(backupPath);

      logger.info('Database backup created successfully', {
        originalSize: stats.size,
        backupSize: backupStats.size,
        backupPath,
      });

      // Очищаємо старі backup
      await cleanOldBackups(backupDir);

      return true;
    }

    return false;
  } catch (error) {
    logger.error('Error creating database backup', error);
    return false;
  }
}

/**
 * Видалити старі backup файли
 */
async function cleanOldBackups(backupDir: string): Promise<void> {
  try {
    const backupFiles = fs
      .readdirSync(backupDir)
      .filter((file) => file.endsWith('.db'))
      .map((file) => ({
        name: file,
        path: path.join(backupDir, file),
        time: fs.statSync(path.join(backupDir, file)).mtime.getTime(),
      }))
      .sort((a, b) => b.time - a.time); // Сортуємо від нових до старих

    // Видаляємо файли старші за MAX_BACKUPS
    if (backupFiles.length > MAX_BACKUPS) {
      const toDelete = backupFiles.slice(MAX_BACKUPS);

      for (const file of toDelete) {
        fs.unlinkSync(file.path);
        logger.info('Old backup deleted', { file: file.name });
      }
    }
  } catch (error) {
    logger.error('Error cleaning old backups', error);
  }
}

/**
 * Запустити автоматичний backup scheduler
 */
export function startAutoBackup(): NodeJS.Timeout {
  logger.info('Starting automatic backup scheduler', {
    interval: `${BACKUP_INTERVAL / (60 * 60 * 1000)} hours`,
    maxBackups: MAX_BACKUPS,
  });

  // Створюємо перший backup одразу
  createBackup();

  // Запускаємо періодичний backup
  const interval = setInterval(() => {
    createBackup();
  }, BACKUP_INTERVAL);

  return interval;
}

/**
 * Зупинити автоматичний backup
 */
export function stopAutoBackup(interval: NodeJS.Timeout): void {
  clearInterval(interval);
  logger.info('Automatic backup scheduler stopped');
}
