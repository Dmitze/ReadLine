"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const models_1 = require("../database/models");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const logger_1 = require("../utils/logger");
const initializeDatabase = async () => {
    try {
        logger_1.logger.info('Initializing database');
        const dbPath = process.env.DB_PATH || './database/library.db';
        const dbDir = path_1.default.dirname(dbPath);
        if (!fs_1.default.existsSync(dbDir)) {
            fs_1.default.mkdirSync(dbDir, { recursive: true });
            logger_1.logger.info('Created database directory', { path: dbDir });
        }
        await (0, models_1.initDatabase)();
        logger_1.logger.info('Database initialized successfully');
    }
    catch (error) {
        logger_1.logger.error('Failed to initialize database', error instanceof Error ? error : new Error(String(error)));
        process.exit(1);
    }
};
initializeDatabase();
exports.default = {};
//# sourceMappingURL=database.js.map