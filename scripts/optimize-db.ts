import { db } from '../src/database/tables/db';
import { DatabaseWrapper } from '../src/database/dbWrapper';
import { IndexManager } from '../src/database/IndexManager';
import { logger } from '../src/utils/logger';

async function optimizeDatabase() {
  const dbWrapper = new DatabaseWrapper(db);

  try {
    logger.info('Starting database optimization...');

    const indexManager = new IndexManager(dbWrapper);

    logger.info('Getting database stats before optimization...');
    const statsBefore = await indexManager.getDatabaseStats();
    logger.info('Database stats before:', statsBefore);

    logger.info('Creating indexes...');
    const indexResults = await indexManager.createAllIndexes();
    logger.info('Index creation results:', indexResults);

    logger.info('Analyzing database...');
    await indexManager.analyze();

    logger.info('Vacuuming database...');
    await indexManager.vacuum();

    logger.info('Getting database stats after optimization...');
    const statsAfter = await indexManager.getDatabaseStats();
    logger.info('Database stats after:', statsAfter);

    const sizeDiff = statsBefore.totalSize - statsAfter.totalSize;
    const improvement = ((sizeDiff / statsBefore.totalSize) * 100).toFixed(2);

    logger.info('=== OPTIMIZATION COMPLETE ===');
    logger.info(`Indexes created: ${indexResults.created}`);
    logger.info(`Indexes skipped: ${indexResults.skipped}`);
    logger.info(`Errors: ${indexResults.errors}`);
    logger.info(`Database size before: ${statsBefore.totalSize} MB`);
    logger.info(`Database size after: ${statsAfter.totalSize} MB`);
    logger.info(`Space saved: ${sizeDiff.toFixed(2)} MB (${improvement}%)`);

    db.close((err) => {
      if (err) logger.error('Error closing database', err);
      process.exit(0);
    });
  } catch (error) {
    logger.error(
      'Error optimizing database',
      error instanceof Error ? error : new Error(String(error))
    );
    db.close((err) => {
      if (err) logger.error('Error closing database', err);
      process.exit(1);
    });
  }
}

optimizeDatabase();
