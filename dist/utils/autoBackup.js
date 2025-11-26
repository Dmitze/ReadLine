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
exports.createBackup = createBackup;
exports.startAutoBackup = startAutoBackup;
exports.stopAutoBackup = stopAutoBackup;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const logger_1 = require("./logger");
const BACKUP_INTERVAL = 24 * 60 * 60 * 1000;
const MAX_BACKUPS = 7;
async function createBackup() {
    try {
        logger_1.logger.info('Starting database backup...');
        const dbPath = process.env.DB_PATH || './database/library.db';
        const fullDbPath = path.resolve(dbPath);
        if (!fs.existsSync(fullDbPath)) {
            logger_1.logger.error('Database file not found', { path: fullDbPath });
            return false;
        }
        const backupDir = path.resolve('./backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        const timestamp = new Date()
            .toISOString()
            .replace(/[:.]/g, '-')
            .replace('T', '_')
            .split('.')[0];
        const backupFileName = `library-backup-${timestamp}.db`;
        const backupPath = path.join(backupDir, backupFileName);
        fs.copyFileSync(fullDbPath, backupPath);
        if (fs.existsSync(backupPath)) {
            const stats = fs.statSync(fullDbPath);
            const backupStats = fs.statSync(backupPath);
            logger_1.logger.info('Database backup created successfully', {
                originalSize: stats.size,
                backupSize: backupStats.size,
                backupPath,
            });
            await cleanOldBackups(backupDir);
            return true;
        }
        return false;
    }
    catch (error) {
        logger_1.logger.error('Error creating database backup', error);
        return false;
    }
}
async function cleanOldBackups(backupDir) {
    try {
        const backupFiles = fs
            .readdirSync(backupDir)
            .filter((file) => file.endsWith('.db'))
            .map((file) => ({
            name: file,
            path: path.join(backupDir, file),
            time: fs.statSync(path.join(backupDir, file)).mtime.getTime(),
        }))
            .sort((a, b) => b.time - a.time);
        if (backupFiles.length > MAX_BACKUPS) {
            const toDelete = backupFiles.slice(MAX_BACKUPS);
            for (const file of toDelete) {
                fs.unlinkSync(file.path);
                logger_1.logger.info('Old backup deleted', { file: file.name });
            }
        }
    }
    catch (error) {
        logger_1.logger.error('Error cleaning old backups', error);
    }
}
function startAutoBackup() {
    logger_1.logger.info('Starting automatic backup scheduler', {
        interval: `${BACKUP_INTERVAL / (60 * 60 * 1000)} hours`,
        maxBackups: MAX_BACKUPS,
    });
    createBackup();
    const interval = setInterval(() => {
        createBackup();
    }, BACKUP_INTERVAL);
    return interval;
}
function stopAutoBackup(interval) {
    clearInterval(interval);
    logger_1.logger.info('Automatic backup scheduler stopped');
}
//# sourceMappingURL=autoBackup.js.map