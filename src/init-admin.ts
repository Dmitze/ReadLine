import dotenv from 'dotenv';
import { addAdmin } from './database/models';
import { logger } from './utils/logger';

dotenv.config();

const initAdmin = async () => {
  try {
    if (!process.env.ADMIN_ID) {
      logger.error(
        'ADMIN_ID not found in .env file',
        new Error('ADMIN_ID environment variable is required')
      );
      process.exit(1);
    }

    const adminIdStr = process.env.ADMIN_ID;
    const adminIds = adminIdStr
      .split(',')
      .map((id) => parseInt(id.trim(), 10))
      .filter((id) => !isNaN(id) && id > 0);

    if (adminIds.length === 0) {
      logger.error(
        'Invalid ADMIN_ID - must contain at least one positive integer',
        new Error(`ADMIN_ID='${adminIdStr}' does not contain valid numeric IDs`)
      );
      process.exit(1);
    }

    logger.info('Initializing admin users', { count: adminIds.length, ids: adminIds });

    let addedCount = 0;
    let existingCount = 0;

    for (const adminId of adminIds) {
      try {
        const result = await addAdmin(adminId, 'admin');

        if (result) {
          logger.info('Admin successfully added', { adminId });
          addedCount++;
        } else {
          logger.info('Admin already exists', { adminId });
          existingCount++;
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (errorMsg.includes('UNIQUE constraint failed')) {
          logger.info('Admin already exists (database constraint)', { adminId });
          existingCount++;
        } else {
          logger.error(
            'Error adding admin',
            error instanceof Error ? error : new Error(String(error))
          );
        }
      }
    }

    logger.info('✅ Admin initialization completed', {
      addedCount,
      existingCount,
      totalCount: adminIds.length,
      message: `${addedCount} added, ${existingCount} already exist`,
    });
  } catch (error) {
    logger.error(
      'Fatal error during admin initialization',
      error instanceof Error ? error : new Error(String(error))
    );
    process.exit(1);
  }
};

initAdmin();
