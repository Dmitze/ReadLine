#!/usr/bin/env ts-node

import * as path from 'path';
import * as dotenv from 'dotenv';
import { Database } from '../src/database/dbWrapper';
import { MigrationManager } from '../src/database/MigrationManager';

dotenv.config();

const dbPath = process.env.DATABASE_URL || path.join(__dirname, '../database.sqlite');

async function main() {
  const command = process.argv[2] || 'migrate';
  const arg = process.argv[3];

  try {
    const db = new Database(dbPath);
    await db.initialize();

    const manager = new MigrationManager(db);
    await manager.init();

    console.log('🚀 Database Migration CLI\n');

    switch (command) {
      case 'migrate':
        await manager.migrate();
        break;

      case 'rollback':
        await manager.rollback(arg);
        break;

      case 'status':
        await manager.printStatus();
        break;

      case 'reset':
        if (process.env.NODE_ENV === 'production') {
          console.error('❌ Cannot reset database in production');
          process.exit(1);
        }
        await manager.reset();
        break;

      case 'fresh':
        if (process.env.NODE_ENV === 'production') {
          console.error('❌ Cannot refresh database in production');
          process.exit(1);
        }
        await manager.fresh();
        break;

      case 'validate':
        const validation = await manager.validate();
        if (validation.valid) {
          console.log('✅ All migrations are valid');
        } else {
          console.log('❌ Migration errors found:');
          validation.errors.forEach((err) => console.log(`  - ${err}`));
          process.exit(1);
        }
        break;

      case 'run':
        if (!arg) {
          console.error('❌ Please specify migration version: migrate run <version>');
          process.exit(1);
        }
        await manager.runSpecific(arg);
        break;

      default:
        console.error(`Unknown command: ${command}`);
        console.error('\nAvailable commands:');
        console.error('  migrate              Run pending migrations');
        console.error('  rollback [version]   Rollback to specific version');
        console.error('  status               Show migration status');
        console.error('  reset                Reset database (dev only)');
        console.error('  fresh                Reset and migrate (dev only)');
        console.error('  validate             Validate migrations');
        console.error('  run <version>        Run specific migration');
        process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
