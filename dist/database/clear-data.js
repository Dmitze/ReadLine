"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearAllData = clearAllData;
const sqlite3_1 = __importDefault(require("sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const dbPath = path_1.default.join(__dirname, '../../database/library.db');
const uploadsDir = path_1.default.join(__dirname, '../../uploads');
const logsDir = path_1.default.join(__dirname, '../../logs');
async function clearAllData() {
    await new Promise((resolve, reject) => {
        const db = new sqlite3_1.default.Database(dbPath, (err) => {
            if (err) {
                reject(err);
                return;
            }
            const clearSQL = `
        DELETE FROM used_promo_codes;
        DELETE FROM user_stats;
        DELETE FROM user_activity;
        DELETE FROM search_history;
        DELETE FROM notifications;
        DELETE FROM feedback;
        DELETE FROM reviews;
        DELETE FROM saved_books;
        DELETE FROM book_rating_stats;
        DELETE FROM audio_progress;
        DELETE FROM podcast_reviews;
        DELETE FROM podcast_listens;
        DELETE FROM podcasts;
        DELETE FROM book_requests;
        DELETE FROM book_tags;
        DELETE FROM tags;
        DELETE FROM book_orders;
        DELETE FROM promo_codes;
        DELETE FROM books;
        DELETE FROM users;
      `;
            db.exec(clearSQL, (err) => {
                if (err) {
                    if (err.message.includes('no such table')) {
                        console.log('Some tables do not exist yet (will be created on startup)');
                        db.close();
                        resolve('Database will be initialized on next startup');
                    }
                    else {
                        db.close();
                        reject(err);
                    }
                }
                else {
                    db.close();
                    resolve('Database records cleared successfully');
                }
            });
        });
    });
    if (fs_1.default.existsSync(uploadsDir)) {
        const files = fs_1.default.readdirSync(uploadsDir);
        for (const file of files) {
            if (file !== '.gitkeep') {
                const filePath = path_1.default.join(uploadsDir, file);
                if (fs_1.default.statSync(filePath).isFile()) {
                    fs_1.default.unlinkSync(filePath);
                }
                else {
                    fs_1.default.rmSync(filePath, { recursive: true, force: true });
                }
            }
        }
        console.log('Uploads directory cleared');
    }
    if (fs_1.default.existsSync(logsDir)) {
        const logFiles = fs_1.default.readdirSync(logsDir);
        for (const file of logFiles) {
            if (file.endsWith('.log')) {
                fs_1.default.unlinkSync(path_1.default.join(logsDir, file));
            }
        }
        console.log('Log files cleared');
    }
    return 'Total cleanup completed successfully';
}
if (require.main === module) {
    clearAllData()
        .then((msg) => {
        console.log(msg);
        process.exit(0);
    })
        .catch((err) => {
        console.error('Error clearing data:', err);
        process.exit(1);
    });
}
//# sourceMappingURL=clear-data.js.map