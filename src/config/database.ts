import { initDatabase } from '../database/models';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// ✅ ВИПРАВЛЕНО #13: async initialization
const initializeDatabase = async () => {
  try {
    console.log('Initializing database...');
    
    // Створення директорії для БД якщо не існує
    const dbPath = process.env.DB_PATH || './database/library.db';
    const dbDir = path.dirname(dbPath);
    
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      console.log(`📁 Створено директорію для БД: ${dbDir}`);
    }
    
    await initDatabase();
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    process.exit(1);
  }
};

initializeDatabase();

export default {
  // Database initialization is handled above
};