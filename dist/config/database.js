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
const initializeDatabase = async () => {
    try {
        console.log('Initializing database...');
        const dbPath = process.env.DB_PATH || './database/library.db';
        const dbDir = path_1.default.dirname(dbPath);
        if (!fs_1.default.existsSync(dbDir)) {
            fs_1.default.mkdirSync(dbDir, { recursive: true });
            console.log(`📁 Створено директорію для БД: ${dbDir}`);
        }
        await (0, models_1.initDatabase)();
        console.log('✅ Database initialized successfully');
    }
    catch (error) {
        console.error('❌ Failed to initialize database:', error);
        process.exit(1);
    }
};
initializeDatabase();
exports.default = {};
//# sourceMappingURL=database.js.map