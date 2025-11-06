"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const models_1 = require("../database/models");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const initializeDatabase = async () => {
    try {
        console.log('Initializing database...');
        (0, models_1.initDatabase)();
        console.log('Database initialized successfully');
    }
    catch (error) {
        console.error('Failed to initialize database:', error);
        process.exit(1);
    }
};
initializeDatabase();
exports.default = {};
//# sourceMappingURL=database.js.map