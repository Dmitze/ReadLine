import { initDatabase } from '../database/models';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

import { logger } from '../utils/logger';

// ✅ ВИПРАВЛЕНО #13: async initialization
const initializeDatabase = async () => {
  try {
    logger.info('Initializing database');
    
    const dbPath = process.env.DB_PATH || './database/library.db';
    const dbDir = path.dirname(dbPath);
    
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      logger.info('Created database directory', { path: dbDir });
    }
    
    await initDatabase();
    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize database', error instanceof Error ? error : new Error(String(error)));
    process.exit(1);
  }
};

initializeDatabase();

export default {
  // Database initialization is handled above
};