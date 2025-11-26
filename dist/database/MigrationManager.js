"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MigrationManager = void 0;
exports.createMigrationManager = createMigrationManager;
const Migration_1 = require("./Migration");
const dbWrapper_1 = require("./dbWrapper");
const migrations_1 = require("./migrations");
const logger_1 = require("../utils/logger");
class MigrationManager {
    constructor(db) {
        this.db = db;
        this.wrapper = new dbWrapper_1.DatabaseWrapper(db);
        this.runner = new Migration_1.MigrationRunner(this.wrapper);
    }
    async init() {
        await this.runner.initialize();
        this.runner.registerAll(...migrations_1.allMigrations);
    }
    async migrate() {
        logger_1.logger.info('🔄 Running database migrations...\n');
        const status = await this.getStatus();
        logger_1.logger.info(`📊 Status: ${status.executed}/${status.total} migrations completed\n`);
        if (status.pending === 0) {
            logger_1.logger.info('✅ Database is up to date - no pending migrations');
            return { count: 0, migrations: [] };
        }
        logger_1.logger.info(`⏳ Running ${status.pending} pending migrations...\n`);
        const results = await this.runner.runPending();
        logger_1.logger.info('\n✅ Migration complete!');
        logger_1.logger.info(`📦 ${results.length} migrations executed`);
        logger_1.logger.info(`⏱️  Total time: ${results.reduce((sum, r) => sum + r.duration, 0)}ms\n`);
        return {
            count: results.length,
            migrations: results.map((r) => `${r.version} - ${r.name}`),
        };
    }
    async rollback(targetVersion) {
        logger_1.logger.info('🔄 Rolling back migrations...\n');
        const results = await this.runner.rollback(targetVersion);
        logger_1.logger.info('\n✅ Rollback complete!');
        logger_1.logger.info(`🔙 ${results.length} migrations rolled back\n`);
        return {
            count: results.length,
            migrations: results.map((r) => `${r.version} - ${r.name}`),
        };
    }
    async getStatus() {
        const executed = await this.runner.getExecuted();
        const status = await this.runner.getStatus();
        const migrations = migrations_1.allMigrations.map((m) => {
            const executedRecord = executed.find((r) => r.version === m.version);
            const status = executedRecord ? 'executed' : 'pending';
            return {
                version: m.version,
                name: m.name,
                status,
                executedAt: executedRecord?.executed_at,
                duration: executedRecord?.duration_ms,
            };
        });
        return {
            total: status.total,
            executed: status.executed.length,
            pending: status.pending.length,
            migrations,
        };
    }
    async reset() {
        logger_1.logger.info('⚠️  CAUTION: This will delete all data!\n');
        if (process.env.NODE_ENV === 'production') {
            throw new Error('Cannot reset database in production');
        }
        await this.runner.reset();
    }
    async fresh() {
        logger_1.logger.info('🔄 Refreshing database...\n');
        if (process.env.NODE_ENV === 'production') {
            throw new Error('Cannot refresh database in production');
        }
        await this.reset();
        logger_1.logger.info('\n');
        await this.migrate();
    }
    async printStatus() {
        const status = await this.getStatus();
        logger_1.logger.info('\n📊 Database Migration Status\n');
        logger_1.logger.info(`Total Migrations: ${status.total}`);
        logger_1.logger.info(`✅ Executed: ${status.executed}`);
        logger_1.logger.info(`⏳ Pending: ${status.pending}`);
        logger_1.logger.info('\n' + '─'.repeat(60) + '\n');
        for (const migration of status.migrations) {
            const icon = migration.status === 'executed' ? '✅' : '⏳';
            const executedInfo = migration.status === 'executed'
                ? ` (${migration.duration}ms, ${migration.executedAt})`
                : '';
            logger_1.logger.info(`${icon} ${migration.version.padEnd(35)} ${migration.name}${executedInfo}`);
        }
        logger_1.logger.info('\n' + '─'.repeat(60) + '\n');
    }
    async runSpecific(version) {
        const migration = migrations_1.allMigrations.find((m) => m.version === version);
        if (!migration) {
            throw new Error(`Migration not found: ${version}`);
        }
        const isExecuted = await this.runner.isExecuted(version);
        if (isExecuted) {
            throw new Error(`Migration already executed: ${version}`);
        }
        logger_1.logger.info(`🔄 Running migration: ${version} - ${migration.name}`);
        const startTime = Date.now();
        try {
            await migration.up(this.db);
            const duration = Date.now() - startTime;
            await this.db.run('INSERT INTO schema_migrations (version, name, duration_ms) VALUES (?, ?, ?)', [version, migration.name, duration]);
            logger_1.logger.info(`✅ Migration executed in ${duration}ms`);
        }
        catch (error) {
            logger_1.logger.error(`❌ Migration failed: ${version}`);
            throw error;
        }
    }
    async validate() {
        const errors = [];
        const executed = await this.runner.getExecuted();
        for (const record of executed) {
            if (!migrations_1.allMigrations.some((m) => m.version === record.version)) {
                errors.push(`Orphan migration found: ${record.version} (no definition found)`);
            }
        }
        const executedVersions = executed.map((r) => r.version);
        const sortedVersions = [...executedVersions].sort();
        if (executedVersions.join(',') !== sortedVersions.join(',')) {
            errors.push('Migrations were not executed in order');
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
}
exports.MigrationManager = MigrationManager;
async function createMigrationManager(db) {
    const manager = new MigrationManager(db);
    await manager.init();
    return manager;
}
//# sourceMappingURL=MigrationManager.js.map