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
            logger_1.logger.error('ADMIN_ID not found in .env file');
            console.error('Please set ADMIN_ID in your .env file');
            process.exit(1);
        }
        const adminIdStr = process.env.ADMIN_ID;
        const adminId = parseInt(adminIdStr);
        if (isNaN(adminId) || adminId <= 0) {
            logger_1.logger.error('Invalid ADMIN_ID', new Error('ADMIN_ID must be a positive integer'), { adminIdStr });
            console.error('❌ Invalid ADMIN_ID. Please provide a valid positive integer.');
            process.exit(1);
        }
        logger_1.logger.info('Initializing admin user', { adminId });
        console.log(`Initializing admin user with ID: ${adminId}`);
        const result = await (0, models_1.addAdmin)(adminId, 'admin');
        if (result) {
            logger_1.logger.info('Admin successfully added', { adminId });
            console.log(`✅ Admin with ID ${adminId} successfully added to the database`);
        }
        else {
            logger_1.logger.info('Admin already exists', { adminId });
            console.log(`ℹ️ Admin with ID ${adminId} already exists in the database`);
        }
        logger_1.logger.info('Admin initialization completed');
        console.log('✅ Admin initialization completed successfully');
    }
    catch (error) {
        logger_1.logger.error('Error adding admin', error instanceof Error ? error : new Error(String(error)));
        console.error('❌ Error adding admin:', error);
        process.exit(1);
    }
};
initAdmin();
//# sourceMappingURL=init-admin.js.map