// Script to initialize the first admin user
import dotenv from 'dotenv';
import { addAdmin } from './database/models';
import { logger } from './utils/logger';

dotenv.config();

const initAdmin = async () => {
  try {
    if (!process.env.ADMIN_ID) {
      logger.error('ADMIN_ID not found in .env file');
      console.error('Please set ADMIN_ID in your .env file');
      process.exit(1);
    }
    
    // Validate admin ID
    const adminIdStr = process.env.ADMIN_ID;
    const adminId = parseInt(adminIdStr!);
    
    if (isNaN(adminId) || adminId <= 0) {
      logger.error('Invalid ADMIN_ID', new Error('ADMIN_ID must be a positive integer'), { adminIdStr });
      console.error('❌ Invalid ADMIN_ID. Please provide a valid positive integer.');
      process.exit(1);
    }
    
    logger.info('Initializing admin user', { adminId });
    
    const result = await addAdmin(adminId, 'admin');
    
    if (result) {
      logger.info('Admin successfully added', { adminId });
    } else {
      logger.info('Admin already exists', { adminId });
    }
    
    logger.info('Admin initialization completed');
  } catch (error) {
    logger.error('Error adding admin', error instanceof Error ? error : new Error(String(error)));
    console.error('❌ Error adding admin:', error);
    process.exit(1);
  }
};

initAdmin();