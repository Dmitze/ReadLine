"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const models_1 = require("./database/models");
const logger_1 = require("./utils/logger");
dotenv_1.default.config();
const initAdmin = async () => {
    try {
        if (!process.env.ADMIN_ID) {
            logger_1.logger.error('ADMIN_ID not found in .env file', new Error('ADMIN_ID environment variable is required'));
            process.exit(1);
        }
        const adminIdStr = process.env.ADMIN_ID;
        const adminId = parseInt(adminIdStr);
        if (isNaN(adminId) || adminId <= 0) {
            logger_1.logger.error('Invalid ADMIN_ID - must be a positive integer', new Error(`ADMIN_ID='${adminIdStr}' is not a valid positive integer`));
            process.exit(1);
        }
        logger_1.logger.info('Initializing admin user', { adminId });
        const result = await (0, models_1.addAdmin)(adminId, 'admin');
        if (result) {
            logger_1.logger.info('Admin successfully added', { adminId });
        }
        else {
            logger_1.logger.info('Admin already exists', { adminId });
        }
        logger_1.logger.info('Admin initialization completed');
    }
    catch (error) {
        logger_1.logger.error('Error adding admin', error instanceof Error ? error : new Error(String(error)));
        process.exit(1);
    }
};
initAdmin();
//# sourceMappingURL=init-admin.js.map