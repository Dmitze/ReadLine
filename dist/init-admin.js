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
        const adminIds = adminIdStr
            .split(',')
            .map((id) => parseInt(id.trim(), 10))
            .filter((id) => !isNaN(id) && id > 0);
        if (adminIds.length === 0) {
            logger_1.logger.error('Invalid ADMIN_ID - must contain at least one positive integer', new Error(`ADMIN_ID='${adminIdStr}' does not contain valid numeric IDs`));
            process.exit(1);
        }
        logger_1.logger.info('Initializing admin users', { count: adminIds.length, ids: adminIds });
        let addedCount = 0;
        let existingCount = 0;
        for (const adminId of adminIds) {
            try {
                const result = await (0, models_1.addAdmin)(adminId, 'admin');
                if (result) {
                    logger_1.logger.info('Admin successfully added', { adminId });
                    addedCount++;
                }
                else {
                    logger_1.logger.info('Admin already exists', { adminId });
                    existingCount++;
                }
            }
            catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                if (errorMsg.includes('UNIQUE constraint failed')) {
                    logger_1.logger.info('Admin already exists (database constraint)', { adminId });
                    existingCount++;
                }
                else {
                    logger_1.logger.error('Error adding admin', error instanceof Error ? error : new Error(String(error)));
                }
            }
        }
        logger_1.logger.info('✅ Admin initialization completed', {
            addedCount,
            existingCount,
            totalCount: adminIds.length,
            message: `${addedCount} added, ${existingCount} already exist`,
        });
    }
    catch (error) {
        logger_1.logger.error('Fatal error during admin initialization', error instanceof Error ? error : new Error(String(error)));
        process.exit(1);
    }
};
initAdmin();
//# sourceMappingURL=init-admin.js.map