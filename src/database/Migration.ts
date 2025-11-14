/**
 * Database Migration System
 * Manages versioning and execution of database schema migrations
 */

import { Database, DatabaseWrapper } from './dbWrapper';

export interface IMigration {
  version: string;
  name: string;
  up: (db: Database | DatabaseWrapper) => Promise<void>;
  down?: (db: Database | DatabaseWrapper) => Promise<void>;
}

export interface MigrationRecord {
  id: number;
  version: string;
  name: string;
  executed_at: string;
  duration_ms: number;
}

export class MigrationRunner {
  private db: DatabaseWrapper;
  private migrations: Map<string, IMigration> = new Map();
  private tableName = 'schema_migrations';

  constructor(db: Database | DatabaseWrapper) {
    this.db = db instanceof DatabaseWrapper ? db : new DatabaseWrapper(db);
  }

  /**
   * Register a migration
   */
  register(migration: IMigration): void {
    this.migrations.set(migration.version, migration);
  }

  /**
   * Register multiple migrations at once
   */
  registerAll(...migrations: IMigration[]): void {
    migrations.forEach(m => this.register(m));
  }

  /**
   * Initialize migrations table
   */
  async initialize(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        duration_ms INTEGER NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_migrations_version 
      ON ${this.tableName}(version);
    `;

    try {
      await this.db.run(sql);
    } catch (error) {
      if (!String(error).includes('already exists')) {
        throw error;
      }
    }
  }

  /**
   * Get executed migrations
   */
  async getExecuted(): Promise<MigrationRecord[]> {
    const sql = `SELECT * FROM ${this.tableName} ORDER BY version`;
    return (await this.db.all(sql)) as MigrationRecord[];
  }

  /**
   * Check if migration is executed
   */
  async isExecuted(version: string): Promise<boolean> {
    const sql = `SELECT 1 FROM ${this.tableName} WHERE version = ?`;
    const result = await this.db.get(sql, [version]);
    return !!result;
  }

  /**
   * Run pending migrations
   */
  async runPending(): Promise<{ version: string; name: string; duration: number }[]> {
    await this.initialize();

    const executed = new Set((await this.getExecuted()).map(r => r.version));
    const pending = Array.from(this.migrations.values())
      .filter(m => !executed.has(m.version))
      .sort((a, b) => a.version.localeCompare(b.version));

    const results = [];

    for (const migration of pending) {
      const startTime = Date.now();
      try {
        console.log(`\n📦 Running migration: ${migration.version} - ${migration.name}`);
        await migration.up(this.db);

        const duration = Date.now() - startTime;
        const sql = `
          INSERT INTO ${this.tableName} (version, name, duration_ms)
          VALUES (?, ?, ?)
        `;
        await this.db.run(sql, [migration.version, migration.name, duration]);

        results.push({
          version: migration.version,
          name: migration.name,
          duration
        });

        console.log(`✅ Completed in ${duration}ms`);
      } catch (error) {
        console.error(`❌ Migration failed: ${migration.version}`);
        throw error;
      }
    }

    return results;
  }

  /**
   * Rollback to specific version
   */
  async rollback(targetVersion?: string): Promise<{ version: string; name: string }[]> {
    await this.initialize();

    const executed = await this.getExecuted();
    const toRollback = targetVersion
      ? executed.filter(r => r.version > targetVersion)
      : executed.slice(-1);

    const rolledBack = [];

    // Rollback in reverse order
    for (let i = toRollback.length - 1; i >= 0; i--) {
      const record = toRollback[i];
      const migration = this.migrations.get(record.version);

      if (!migration) {
        throw new Error(`Migration not found: ${record.version}`);
      }

      if (!migration.down) {
        throw new Error(`No rollback defined for migration: ${record.version}`);
      }

      try {
        console.log(`\n🔄 Rolling back: ${record.version} - ${record.name}`);
        await migration.down(this.db);

        const sql = `DELETE FROM ${this.tableName} WHERE version = ?`;
        await this.db.run(sql, [record.version]);

        rolledBack.push({
          version: record.version,
          name: record.name
        });

        console.log(`✅ Rolled back`);
      } catch (error) {
        console.error(`❌ Rollback failed: ${record.version}`);
        throw error;
      }
    }

    return rolledBack;
  }

  /**
   * Get migration status
   */
  async getStatus(): Promise<{
    executed: string[];
    pending: string[];
    total: number;
  }> {
    const executed = (await this.getExecuted()).map(r => r.version);
    const pending = Array.from(this.migrations.keys()).filter(
      v => !executed.includes(v)
    );

    return {
      executed,
      pending,
      total: this.migrations.size
    };
  }

  /**
   * Reset database (rollback all migrations)
   */
  async reset(): Promise<void> {
    console.log('\n⚠️  Resetting database - rolling back all migrations...');
    const executed = await this.getExecuted();

    for (let i = executed.length - 1; i >= 0; i--) {
      const record = executed[i];
      const migration = this.migrations.get(record.version);

      if (!migration?.down) {
        console.warn(`⚠️  No rollback for: ${record.version}`);
        continue;
      }

      try {
        await migration.down(this.db);
        await this.db.run(
          `DELETE FROM ${this.tableName} WHERE version = ?`,
          [record.version]
        );
        console.log(`✅ Rolled back: ${record.version}`);
      } catch (error) {
        console.error(`❌ Failed to rollback: ${record.version}`);
        throw error;
      }
    }

    console.log('✅ Database reset complete');
  }
}

/**
 * Create migrations table if not exists
 */
export async function initializeMigrations(db: Database): Promise<MigrationRunner> {
  const runner = new MigrationRunner(db);
  await runner.initialize();
  return runner;
}
