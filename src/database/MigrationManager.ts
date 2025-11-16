/**
 * Database Migration Manager
 * High-level API for managing database migrations
 */

import { MigrationRunner } from './Migration';
import { Database, DatabaseWrapper } from './dbWrapper';
import { allMigrations } from './migrations';
import { logger } from '../utils/logger';

export interface MigrationStatus {
  total: number;
  executed: number;
  pending: number;
  migrations: {
    version: string;
    name: string;
    status: 'executed' | 'pending';
    executedAt?: string;
    duration?: number;
  }[];
}

export class MigrationManager {
  private runner: MigrationRunner;
  private db: Database;
  private wrapper: DatabaseWrapper;

  constructor(db: Database) {
    this.db = db;
    this.wrapper = new DatabaseWrapper(db);
    this.runner = new MigrationRunner(this.wrapper);
  }

  /**
   * Initialize the migration system
   */
  async init(): Promise<void> {
    await this.runner.initialize();
    this.runner.registerAll(...allMigrations);
  }

  /**
   * Run all pending migrations
   */
  async migrate(): Promise<{ count: number; migrations: string[] }> {
    logger.info('🔄 Running database migrations...\n');

    const status = await this.getStatus();
    logger.info(`📊 Status: ${status.executed}/${status.total} migrations completed\n`);

    if (status.pending === 0) {
      logger.info('✅ Database is up to date - no pending migrations');
      return { count: 0, migrations: [] };
    }

    logger.info(`⏳ Running ${status.pending} pending migrations...\n`);

    const results = await this.runner.runPending();

    logger.info('\n✅ Migration complete!');
    logger.info(`📦 ${results.length} migrations executed`);
    logger.info(`⏱️  Total time: ${results.reduce((sum, r) => sum + r.duration, 0)}ms\n`);

    return {
      count: results.length,
      migrations: results.map(r => `${r.version} - ${r.name}`)
    };
  }

  /**
   * Rollback last migration or specific version
   */
  async rollback(targetVersion?: string): Promise<{ count: number; migrations: string[] }> {
    logger.info('🔄 Rolling back migrations...\n');

    const results = await this.runner.rollback(targetVersion);

    logger.info('\n✅ Rollback complete!');
    logger.info(`🔙 ${results.length} migrations rolled back\n`);

    return {
      count: results.length,
      migrations: results.map(r => `${r.version} - ${r.name}`)
    };
  }

  /**
   * Get migration status
   */
  async getStatus(): Promise<MigrationStatus> {
    const executed = await this.runner.getExecuted();
    const status = await this.runner.getStatus();

    const migrations = allMigrations.map(m => {
      const executedRecord = executed.find(r => r.version === m.version);
      const status: 'executed' | 'pending' = executedRecord ? 'executed' : 'pending';
      return {
        version: m.version,
        name: m.name,
        status,
        executedAt: executedRecord?.executed_at,
        duration: executedRecord?.duration_ms
      };
    });

    return {
      total: status.total,
      executed: status.executed.length,
      pending: status.pending.length,
      migrations
    };
  }

  /**
   * Reset database (rollback all migrations)
   */
  async reset(): Promise<void> {
    logger.info('⚠️  CAUTION: This will delete all data!\n');

    // In production, require confirmation
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot reset database in production');
    }

    await this.runner.reset();
  }

  /**
   * Fresh database (reset + migrate)
   */
  async fresh(): Promise<void> {
    logger.info('🔄 Refreshing database...\n');

    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot refresh database in production');
    }

    await this.reset();
    logger.info('\n');
    await this.migrate();
  }

  /**
   * Print migration status to console
   */
  async printStatus(): Promise<void> {
    const status = await this.getStatus();

    logger.info('\n📊 Database Migration Status\n');
    logger.info(`Total Migrations: ${status.total}`);
    logger.info(`✅ Executed: ${status.executed}`);
    logger.info(`⏳ Pending: ${status.pending}`);
    logger.info('\n' + '─'.repeat(60) + '\n');

    for (const migration of status.migrations) {
      const icon = migration.status === 'executed' ? '✅' : '⏳';
      const executedInfo =
        migration.status === 'executed'
          ? ` (${migration.duration}ms, ${migration.executedAt})`
          : '';

      logger.info(
        `${icon} ${migration.version.padEnd(35)} ${migration.name}${executedInfo}`
      );
    }

    logger.info('\n' + '─'.repeat(60) + '\n');
  }

  /**
   * Run a specific migration by version (for development/testing)
   */
  async runSpecific(version: string): Promise<void> {
    const migration = allMigrations.find(m => m.version === version);

    if (!migration) {
      throw new Error(`Migration not found: ${version}`);
    }

    const isExecuted = await this.runner.isExecuted(version);

    if (isExecuted) {
      throw new Error(`Migration already executed: ${version}`);
    }

    logger.info(`🔄 Running migration: ${version} - ${migration.name}`);
    const startTime = Date.now();

    try {
      await migration.up(this.db);
      const duration = Date.now() - startTime;

      await this.db.run(
        'INSERT INTO schema_migrations (version, name, duration_ms) VALUES (?, ?, ?)',
        [version, migration.name, duration]
      );

      logger.info(`✅ Migration executed in ${duration}ms`);
    } catch (error) {
      logger.error(`❌ Migration failed: ${version}`);
      throw error;
    }
  }

  /**
   * Validate migration integrity
   */
  async validate(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    const executed = await this.runner.getExecuted();

    // Check that all executed migrations exist
    for (const record of executed) {
      if (!allMigrations.some(m => m.version === record.version)) {
        errors.push(`Orphan migration found: ${record.version} (no definition found)`);
      }
    }

    // Check migrations are in order
    const executedVersions = executed.map(r => r.version);
    const sortedVersions = [...executedVersions].sort();

    if (executedVersions.join(',') !== sortedVersions.join(',')) {
      errors.push('Migrations were not executed in order');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * Create and initialize migration manager
 */
export async function createMigrationManager(
  db: Database
): Promise<MigrationManager> {
  const manager = new MigrationManager(db);
  await manager.init();
  return manager;
}
