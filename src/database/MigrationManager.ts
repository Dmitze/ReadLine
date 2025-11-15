/**
 * Database Migration Manager
 * High-level API for managing database migrations
 */

import { MigrationRunner } from './Migration';
import { Database, DatabaseWrapper } from './dbWrapper';
import { allMigrations } from './migrations';

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
    console.log('🔄 Running database migrations...\n');

    const status = await this.getStatus();
    console.log(`📊 Status: ${status.executed}/${status.total} migrations completed\n`);

    if (status.pending === 0) {
      console.log('✅ Database is up to date - no pending migrations');
      return { count: 0, migrations: [] };
    }

    console.log(`⏳ Running ${status.pending} pending migrations...\n`);

    const results = await this.runner.runPending();

    console.log('\n✅ Migration complete!');
    console.log(`📦 ${results.length} migrations executed`);
    console.log(`⏱️  Total time: ${results.reduce((sum, r) => sum + r.duration, 0)}ms\n`);

    return {
      count: results.length,
      migrations: results.map(r => `${r.version} - ${r.name}`)
    };
  }

  /**
   * Rollback last migration or specific version
   */
  async rollback(targetVersion?: string): Promise<{ count: number; migrations: string[] }> {
    console.log('🔄 Rolling back migrations...\n');

    const results = await this.runner.rollback(targetVersion);

    console.log('\n✅ Rollback complete!');
    console.log(`🔙 ${results.length} migrations rolled back\n`);

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
    console.log('⚠️  CAUTION: This will delete all data!\n');

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
    console.log('🔄 Refreshing database...\n');

    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot refresh database in production');
    }

    await this.reset();
    console.log('\n');
    await this.migrate();
  }

  /**
   * Print migration status to console
   */
  async printStatus(): Promise<void> {
    const status = await this.getStatus();

    console.log('\n📊 Database Migration Status\n');
    console.log(`Total Migrations: ${status.total}`);
    console.log(`✅ Executed: ${status.executed}`);
    console.log(`⏳ Pending: ${status.pending}`);
    console.log('\n' + '─'.repeat(60) + '\n');

    for (const migration of status.migrations) {
      const icon = migration.status === 'executed' ? '✅' : '⏳';
      const executedInfo =
        migration.status === 'executed'
          ? ` (${migration.duration}ms, ${migration.executedAt})`
          : '';

      console.log(
        `${icon} ${migration.version.padEnd(35)} ${migration.name}${executedInfo}`
      );
    }

    console.log('\n' + '─'.repeat(60) + '\n');
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

    console.log(`🔄 Running migration: ${version} - ${migration.name}`);
    const startTime = Date.now();

    try {
      await migration.up(this.db);
      const duration = Date.now() - startTime;

      await this.db.run(
        'INSERT INTO schema_migrations (version, name, duration_ms) VALUES (?, ?, ?)',
        [version, migration.name, duration]
      );

      console.log(`✅ Migration executed in ${duration}ms`);
    } catch (error) {
      console.error(`❌ Migration failed: ${version}`);
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
