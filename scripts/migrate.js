#!/usr/bin/env ts-node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
const dotenv = __importStar(require("dotenv"));
const MigrationManager_1 = require("../src/database/MigrationManager");
dotenv.config();
const dbPath = process.env.DATABASE_URL || path.join(__dirname, '../database.sqlite');
async function main() {
    const command = process.argv[2] || 'migrate';
    const arg = process.argv[3];
    try {
        const db = new Database(dbPath);
        await db.initialize();
        const manager = new MigrationManager_1.MigrationManager(db);
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
                }
                else {
                    console.log('❌ Migration errors found:');
                    validation.errors.forEach(err => console.log(`  - ${err}`));
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
    }
    catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : error);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=migrate.js.map