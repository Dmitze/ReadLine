"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPopularTags = exports.searchBooksByTagWithPagination = exports.searchBooksByTag = exports.removeBookTag = exports.addBookTag = exports.getBooksTagsBatch = exports.getBookTags = exports.addTag = exports.getAllTags = void 0;
const models_1 = require("./models");
const getAllTags = () => {
    return new Promise((resolve, reject) => {
        models_1.db.all('SELECT * FROM tags ORDER BY name', (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows);
        });
    });
};
exports.getAllTags = getAllTags;
const addTag = async (name) => {
    const { isValidTag, normalizeTag } = await Promise.resolve().then(() => __importStar(require('../utils/tagValidator')));
    if (!isValidTag(name)) {
        throw new Error(`Невалідна назва тегу: "${name}". Теги мають бути однослівними або двослівними без пробілів.`);
    }
    const normalized = normalizeTag(name);
    return new Promise((resolve, reject) => {
        models_1.db.run('INSERT INTO tags (name) VALUES (?)', [normalized], function (err) {
            if (err)
                reject(err);
            else {
                try {
                    const { invalidateTagsCache } = require('../scenes/addBook/utils');
                    invalidateTagsCache();
                }
                catch (err) {
                }
                resolve(this.lastID);
            }
        });
    });
};
exports.addTag = addTag;
const getBookTags = (bookId) => {
    return new Promise((resolve, reject) => {
        const query = 'SELECT t.* FROM tags t INNER JOIN book_tags bt ON t.id = bt.tag_id WHERE bt.book_id = ? ORDER BY t.name';
        models_1.db.all(query, [bookId], (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows);
        });
    });
};
exports.getBookTags = getBookTags;
const getBooksTagsBatch = (bookIds) => {
    return new Promise((resolve, reject) => {
        if (bookIds.length === 0) {
            resolve(new Map());
            return;
        }
        const placeholders = bookIds.map(() => '?').join(',');
        const query = `
      SELECT bt.book_id, t.* 
      FROM tags t 
      INNER JOIN book_tags bt ON t.id = bt.tag_id 
      WHERE bt.book_id IN (${placeholders})
      ORDER BY bt.book_id, t.name
    `;
        models_1.db.all(query, bookIds, (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            const result = new Map();
            rows.forEach((row) => {
                const bookId = row.book_id;
                if (!result.has(bookId)) {
                    result.set(bookId, []);
                }
                const { book_id, ...tag } = row;
                result.get(bookId).push(tag);
            });
            resolve(result);
        });
    });
};
exports.getBooksTagsBatch = getBooksTagsBatch;
const addBookTag = (bookId, tagId) => {
    return new Promise((resolve, reject) => {
        models_1.db.run('INSERT OR IGNORE INTO book_tags (book_id, tag_id) VALUES (?, ?)', [bookId, tagId], (err) => {
            if (err)
                reject(err);
            else
                resolve();
        });
    });
};
exports.addBookTag = addBookTag;
const removeBookTag = (bookId, tagId) => {
    return new Promise((resolve, reject) => {
        models_1.db.run('DELETE FROM book_tags WHERE book_id = ? AND tag_id = ?', [bookId, tagId], (err) => {
            if (err)
                reject(err);
            else
                resolve();
        });
    });
};
exports.removeBookTag = removeBookTag;
const searchBooksByTag = (tagName, limit = 10) => {
    return new Promise(async (resolve, reject) => {
        const { sanitizeTag } = await Promise.resolve().then(() => __importStar(require('../utils/sanitization')));
        const sanitizedTagName = sanitizeTag(tagName);
        if (!sanitizedTagName || sanitizedTagName.length < 2) {
            resolve([]);
            return;
        }
        const query = `SELECT DISTINCT b.* FROM books b
      INNER JOIN book_tags bt ON b.id = bt.book_id
      INNER JOIN tags t ON bt.tag_id = t.id
      WHERE t.name LIKE ? AND b.is_available = 1
      ORDER BY b.rating DESC, b.downloads_count DESC LIMIT ?`;
        models_1.db.all(query, [`%${sanitizedTagName}%`, limit], (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows);
        });
    });
};
exports.searchBooksByTag = searchBooksByTag;
const searchBooksByTagWithPagination = (tagName, limit = 10, offset = 0) => {
    return new Promise(async (resolve, reject) => {
        const { sanitizeTag } = await Promise.resolve().then(() => __importStar(require('../utils/sanitization')));
        const sanitizedTagName = sanitizeTag(tagName);
        if (!sanitizedTagName || sanitizedTagName.length < 2) {
            resolve({ books: [], total: 0 });
            return;
        }
        const countQuery = `SELECT COUNT(DISTINCT b.id) as total FROM books b
      INNER JOIN book_tags bt ON b.id = bt.book_id
      INNER JOIN tags t ON bt.tag_id = t.id
      WHERE t.name LIKE ? AND b.is_available = 1`;
        const dataQuery = `SELECT DISTINCT b.* FROM books b
      INNER JOIN book_tags bt ON b.id = bt.book_id
      INNER JOIN tags t ON bt.tag_id = t.id
      WHERE t.name LIKE ? AND b.is_available = 1
      ORDER BY b.rating DESC, b.downloads_count DESC LIMIT ? OFFSET ?`;
        const sanitizedParam = `%${sanitizedTagName}%`;
        models_1.db.get(countQuery, [sanitizedParam], (err, countRow) => {
            if (err) {
                reject(err);
                return;
            }
            models_1.db.all(dataQuery, [sanitizedParam, limit, offset], (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve({ books: rows || [], total: countRow?.total || 0 });
            });
        });
    });
};
exports.searchBooksByTagWithPagination = searchBooksByTagWithPagination;
const getPopularTags = (limit = 10) => {
    return new Promise((resolve, reject) => {
        const query = `SELECT t.*, COUNT(bt.book_id) as count FROM tags t
      LEFT JOIN book_tags bt ON t.id = bt.tag_id GROUP BY t.id ORDER BY count DESC, t.name LIMIT ?`;
        models_1.db.all(query, [limit], (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows);
        });
    });
};
exports.getPopularTags = getPopularTags;
//# sourceMappingURL=tagFunctions.js.map