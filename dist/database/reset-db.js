"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dbPath = path_1.default.join(__dirname, '../../database/library.db');
const dbShmPath = path_1.default.join(__dirname, '../../database/library.db-shm');
const dbWalPath = path_1.default.join(__dirname, '../../database/library.db-wal');
const booksDbPath = path_1.default.join(__dirname, '../../database/books.db');
function deleteFile(filePath) {
    try {
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
            console.log(`✓ Deleted: ${path_1.default.basename(filePath)}`);
            return true;
        }
    }
    catch (err) {
        console.warn(`✗ Could not delete ${path_1.default.basename(filePath)}:`, err.message);
        return false;
    }
    return false;
}
console.log('🔄 Resetting database...');
const files = [dbPath, dbShmPath, dbWalPath, booksDbPath];
let deleted = 0;
for (const file of files) {
    if (deleteFile(file)) {
        deleted++;
    }
}
console.log(`\n✓ Reset complete! Deleted ${deleted} file(s).`);
console.log('📝 Database will be recreated from scratch on next startup.\n');
//# sourceMappingURL=reset-db.js.map