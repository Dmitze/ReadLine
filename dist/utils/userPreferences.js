"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureKeyboardTypeColumn = exports.setUserKeyboardPreference = exports.getUserKeyboardPreference = void 0;
const models_1 = require("../database/models");
const logger_1 = require("./logger");
const getUserKeyboardPreference = (userId) => {
    try {
        const result = models_1.db
            .prepare(`
      SELECT keyboard_type FROM users WHERE user_id = ?
    `)
            .get(userId);
        if (result && result.keyboard_type) {
            return result.keyboard_type;
        }
        return 'mobile';
    }
    catch (error) {
        logger_1.logger.error('Error getting keyboard preference', error instanceof Error ? error : new Error(String(error)));
        return 'mobile';
    }
};
exports.getUserKeyboardPreference = getUserKeyboardPreference;
const setUserKeyboardPreference = (userId, deviceType) => {
    try {
        const user = models_1.db
            .prepare(`
      SELECT id FROM users WHERE user_id = ?
    `)
            .get(userId);
        if (!user) {
            models_1.db.prepare(`
        INSERT INTO users (user_id, keyboard_type, created_at)
        VALUES (?, ?, datetime('now'))
      `).run(userId, deviceType);
        }
        else {
            models_1.db.prepare(`
        UPDATE users SET keyboard_type = ? WHERE user_id = ?
      `).run(deviceType, userId);
        }
        logger_1.logger.info('Keyboard preference updated', { userId, deviceType });
        return true;
    }
    catch (error) {
        logger_1.logger.error('Error setting keyboard preference', error instanceof Error ? error : new Error(String(error)));
        return false;
    }
};
exports.setUserKeyboardPreference = setUserKeyboardPreference;
const ensureKeyboardTypeColumn = () => {
    return new Promise((resolve, reject) => {
        try {
            models_1.db.all('PRAGMA table_info(users)', [], (err, columns) => {
                if (err) {
                    logger_1.logger.error('Error checking keyboard_type column', err);
                    resolve();
                    return;
                }
                const hasKeyboardType = columns.some((col) => col.name === 'keyboard_type');
                if (!hasKeyboardType) {
                    models_1.db.run(`
            ALTER TABLE users ADD COLUMN keyboard_type TEXT DEFAULT 'mobile'
          `, [], (err) => {
                        if (err) {
                            logger_1.logger.error('Error adding keyboard_type column', err);
                        }
                        else {
                            logger_1.logger.info('Added keyboard_type column to users table');
                        }
                        resolve();
                    });
                }
                else {
                    resolve();
                }
            });
        }
        catch (error) {
            logger_1.logger.error('Error ensuring keyboard_type column', error instanceof Error ? error : new Error(String(error)));
            resolve();
        }
    });
};
exports.ensureKeyboardTypeColumn = ensureKeyboardTypeColumn;
//# sourceMappingURL=userPreferences.js.map