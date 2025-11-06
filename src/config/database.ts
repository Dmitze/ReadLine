import { initDatabase } from '../database/models';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Initialize database when config is loaded
const initializeDatabase = async () => {
  try {
    console.log('Initializing database...');
    initDatabase();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
};

initializeDatabase();

export default {
  // Database initialization is handled above
};