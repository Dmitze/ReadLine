"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sqlite3_1 = __importDefault(require("sqlite3"));
const path_1 = __importDefault(require("path"));
const dbPath = path_1.default.join(__dirname, '../database/library.db');
async function cleanupData() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3_1.default.Database(dbPath, (err) => {
            if (err) {
                reject(err);
                return;
            }
            const clearSQL = `
        DELETE FROM reviews;
        DELETE FROM saved_books;
        DELETE FROM book_tags;
        DELETE FROM books;
        DELETE FROM feedback;
        DELETE FROM promo_codes;
      `;
            db.exec(clearSQL, (err) => {
                if (err) {
                    console.error('Error clearing data:', err);
                    db.close();
                    reject(err);
                }
                else {
                    db.get('SELECT COUNT(*) as count FROM books', (err, row) => {
                        db.close();
                        if (err) {
                            console.log('✅ Все данные успешно удалены!');
                            resolve('Cleanup complete');
                        }
                        else {
                            console.log(`✅ Очищено! Осталось книг: ${row.count}`);
                            resolve('Cleanup complete');
                        }
                    });
                }
            });
        });
    });
}
cleanupData()
    .then(() => {
    console.log('✅ База готова к демонстрации бота!');
    process.exit(0);
})
    .catch((err) => {
    console.error('❌ Ошибка:', err);
    process.exit(1);
});
//# sourceMappingURL=cleanup.js.map