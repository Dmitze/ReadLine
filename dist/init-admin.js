"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const models_1 = require("./database/models");
dotenv_1.default.config();
const initAdmin = async () => {
    try {
        if (!process.env.ADMIN_ID) {
            console.log('Please set ADMIN_ID in your .env file');
            process.exit(1);
        }
        const adminIdStr = process.env.ADMIN_ID;
        const adminId = parseInt(adminIdStr);
        if (isNaN(adminId) || adminId <= 0) {
            console.log('❌ Invalid ADMIN_ID. Please provide a valid positive integer.');
            process.exit(1);
        }
        console.log(`Initializing admin user with ID: ${adminId}`);
        const result = await (0, models_1.addAdmin)(adminId, 'admin');
        if (result) {
            console.log(`✅ Admin with ID ${adminId} successfully added to the database`);
        }
        else {
            console.log(`ℹ️ Admin with ID ${adminId} already exists in the database`);
        }
        console.log('✅ Admin initialization completed successfully');
    }
    catch (error) {
        console.error('❌ Error adding admin:', error);
        process.exit(1);
    }
};
initAdmin();
//# sourceMappingURL=init-admin.js.map