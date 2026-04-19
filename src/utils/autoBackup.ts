import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';

const BACKUP_INTERVAL = 24 * 60 * 60 * 1000;
const MAX_BACKUPS = 7;

export async function createBackup(): Promise<boolean> {
  try {
    logger.info('Starting database backup...');

    const dbPath = process.env.DB_PATH || './database/library.db';
    const fullDbPath = path.resolve(dbPath);

    if (!fs.existsSync(fullDbPath)) {
      logger.error('Database file not found', { path: fullDbPath });
      return false;
    }

    const backupDir = path.resolve('./backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .split('.')[0];

    const backupFileName = `library-backup-${timestamp}.db`;
    const backupPath = path.join(backupDir, backupFileName);

    fs.copyFileSync(fullDbPath, backupPath);

    if (fs.existsSync(backupPath)) {
      const stats = fs.statSync(fullDbPath);
      const backupStats = fs.statSync(backupPath);

      logger.info('Database backup created successfully', {
        originalSize: stats.size,
        backupSize: backupStats.size,
        backupPath,
      });

      await cleanOldBackups(backupDir);

      return true;
    }

    return false;
  } catch (error) {
    logger.error('Error creating database backup', error);
    return false;
  }
}

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
      .sort((a, b) => b.time - a.time);

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

export function startAutoBackup(): NodeJS.Timeout {
  logger.info('Starting automatic backup scheduler', {
    interval: `${BACKUP_INTERVAL / (60 * 60 * 1000)} hours`,
    maxBackups: MAX_BACKUPS,
  });

  createBackup();

  const interval = setInterval(() => {
    createBackup();
  }, BACKUP_INTERVAL);

  return interval;
}

export function stopAutoBackup(interval: NodeJS.Timeout): void {
  clearInterval(interval);
  logger.info('Automatic backup scheduler stopped');
}
