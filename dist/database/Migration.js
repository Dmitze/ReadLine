"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MigrationRunner = void 0;
exports.initializeMigrations = initializeMigrations;
const dbWrapper_1 = require("./dbWrapper");
const logger_1 = require("../utils/logger");
class MigrationRunner {
    constructor(db) {
        this.migrations = new Map();
        this.tableName = 'schema_migrations';
        this.db = db instanceof dbWrapper_1.DatabaseWrapper ? db : new dbWrapper_1.DatabaseWrapper(db);
    }
    register(migration) {
        this.migrations.set(migration.version, migration);
    }
    registerAll(...migrations) {
        migrations.forEach((m) => this.register(m));
    }
    async initialize() {
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
        }
        catch (error) {
            if (!String(error).includes('already exists')) {
                throw error;
            }
        }
    }
    async getExecuted() {
        const sql = `SELECT * FROM ${this.tableName} ORDER BY version`;
        return (await this.db.all(sql));
    }
    async isExecuted(version) {
        const sql = `SELECT 1 FROM ${this.tableName} WHERE version = ?`;
        const result = await this.db.get(sql, [version]);
        return !!result;
    }
    async runPending() {
        await this.initialize();
        const executed = new Set((await this.getExecuted()).map((r) => r.version));
        const pending = Array.from(this.migrations.values())
            .filter((m) => !executed.has(m.version))
            .sort((a, b) => a.version.localeCompare(b.version));
        const results = [];
        for (const migration of pending) {
            const startTime = Date.now();
            try {
                logger_1.logger.info(`\n📦 Running migration: ${migration.version} - ${migration.name}`);
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
                    duration,
                });
                logger_1.logger.info(`✅ Completed in ${duration}ms`);
            }
            catch (error) {
                logger_1.logger.error(`❌ Migration failed: ${migration.version}`);
                throw error;
            }
        }
        return results;
    }
    async rollback(targetVersion) {
        await this.initialize();
        const executed = await this.getExecuted();
        const toRollback = targetVersion
            ? executed.filter((r) => r.version > targetVersion)
            : executed.slice(-1);
        const rolledBack = [];
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
                logger_1.logger.info(`\n🔄 Rolling back: ${record.version} - ${record.name}`);
                await migration.down(this.db);
                const sql = `DELETE FROM ${this.tableName} WHERE version = ?`;
                await this.db.run(sql, [record.version]);
                rolledBack.push({
                    version: record.version,
                    name: record.name,
                });
                logger_1.logger.info('✅ Rolled back');
            }
            catch (error) {
                logger_1.logger.error(`❌ Rollback failed: ${record.version}`);
                throw error;
            }
        }
        return rolledBack;
    }
    async getStatus() {
        const executed = (await this.getExecuted()).map((r) => r.version);
        const pending = Array.from(this.migrations.keys()).filter((v) => !executed.includes(v));
        return {
            executed,
            pending,
            total: this.migrations.size,
        };
    }
    async reset() {
        logger_1.logger.info('\n⚠️  Resetting database - rolling back all migrations...');
        const executed = await this.getExecuted();
        for (let i = executed.length - 1; i >= 0; i--) {
            const record = executed[i];
            const migration = this.migrations.get(record.version);
            if (!migration?.down) {
                logger_1.logger.warn(`⚠️  No rollback for: ${record.version}`);
                continue;
            }
            try {
                await migration.down(this.db);
                await this.db.run(`DELETE FROM ${this.tableName} WHERE version = ?`, [record.version]);
                logger_1.logger.info(`✅ Rolled back: ${record.version}`);
            }
            catch (error) {
                logger_1.logger.error(`❌ Failed to rollback: ${record.version}`);
                throw error;
            }
        }
        logger_1.logger.info('✅ Database reset complete');
    }
}
exports.MigrationRunner = MigrationRunner;
async function initializeMigrations(db) {
    const runner = new MigrationRunner(db);
    await runner.initialize();
    return runner;
}
//# sourceMappingURL=Migration.js.map