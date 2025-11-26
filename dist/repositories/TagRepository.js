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
exports.TagRepository = void 0;
const BaseRepository_1 = require("./BaseRepository");
class TagRepository extends BaseRepository_1.BaseRepository {
    constructor(db) {
        super(db, 'tags');
    }
    async getAllTags() {
        return this.query('SELECT * FROM tags ORDER BY name');
    }
    async createTag(name) {
        const { isValidTag, normalizeTag } = await Promise.resolve().then(() => __importStar(require('../utils/tagValidator')));
        if (!isValidTag(name)) {
            throw new Error(`Невалідна назва тегу: "${name}". Теги мають бути однослівними або двослівними без пробілів.`);
        }
        const normalized = normalizeTag(name);
        const tagId = await this.insert({ name: normalized });
        const { invalidateTagsCache } = await Promise.resolve().then(() => __importStar(require('../scenes/addBook/utils')));
        invalidateTagsCache();
        return tagId;
    }
    async getTagById(tagId) {
        const tags = await this.query('SELECT * FROM tags WHERE id = ?', [tagId]);
        return tags[0] || null;
    }
    async getTagByName(name) {
        const tags = await this.query('SELECT * FROM tags WHERE name = ?', [name]);
        return tags[0] || null;
    }
    async updateTag(tagId, updates) {
        const allowedFields = ['name'];
        const validUpdates = {};
        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                validUpdates[key] = value;
            }
        }
        if (Object.keys(validUpdates).length === 0) {
            return 0;
        }
        return this.update(tagId, validUpdates);
    }
    async deleteTag(tagId) {
        return this.delete(tagId);
    }
    async getBookTags(bookId) {
        const query = `
      SELECT t.* FROM tags t
      INNER JOIN book_tags bt ON t.id = bt.tag_id
      WHERE bt.book_id = ?
      ORDER BY t.name
    `;
        return this.query(query, [bookId]);
    }
    async getBooksTagsBatch(bookIds) {
        if (bookIds.length === 0) {
            return new Map();
        }
        const placeholders = bookIds.map(() => '?').join(',');
        const query = `
      SELECT bt.book_id, t.*
      FROM tags t
      INNER JOIN book_tags bt ON t.id = bt.tag_id
      WHERE bt.book_id IN (${placeholders})
      ORDER BY bt.book_id, t.name
    `;
        const results = await this.db.all(query, bookIds);
        const tagMap = new Map();
        results.forEach((row) => {
            const bookId = row.book_id;
            if (!tagMap.has(bookId)) {
                tagMap.set(bookId, []);
            }
            const { book_id, ...tag } = row;
            tagMap.get(bookId).push(tag);
        });
        return tagMap;
    }
    async addBookTag(bookId, tagId) {
        await this.db.run('INSERT OR IGNORE INTO book_tags (book_id, tag_id) VALUES (?, ?)', [
            bookId,
            tagId,
        ]);
    }
    async addBookTags(bookId, tagIds) {
        if (tagIds.length === 0)
            return;
        const placeholders = tagIds.map(() => '(?, ?)').join(', ');
        const values = tagIds.flatMap(tagId => [bookId, tagId]);
        const query = `INSERT OR IGNORE INTO book_tags (book_id, tag_id) VALUES ${placeholders}`;
        await this.db.run(query, values);
    }
    async removeBookTag(bookId, tagId) {
        await this.db.run('DELETE FROM book_tags WHERE book_id = ? AND tag_id = ?', [bookId, tagId]);
    }
    async clearBookTags(bookId) {
        await this.db.run('DELETE FROM book_tags WHERE book_id = ?', [bookId]);
    }
    async searchBooksByTag(tagName, limit = 10) {
        if (!tagName || tagName.trim().length < 2) {
            return [];
        }
        const sanitizedTag = tagName.trim().replace(/[%_\\]/g, '\\$&');
        const query = `
      SELECT DISTINCT b.* FROM books b
      INNER JOIN book_tags bt ON b.id = bt.book_id
      INNER JOIN tags t ON bt.tag_id = t.id
      WHERE t.name LIKE ? AND b.is_available = 1
      ORDER BY b.rating DESC, b.downloads_count DESC
      LIMIT ?
    `;
        return this.db.all(query, [`%${sanitizedTag}%`, limit]);
    }
    async getPopularTags(limit = 10) {
        const query = `
      SELECT t.*, COUNT(bt.book_id) as count FROM tags t
      LEFT JOIN book_tags bt ON t.id = bt.tag_id
      GROUP BY t.id
      ORDER BY count DESC, t.name
      LIMIT ?
    `;
        return this.db.all(query, [limit]);
    }
    async getTagStats(tagId) {
        const results = await this.db.all('SELECT COUNT(*) as count FROM book_tags WHERE tag_id = ?', [tagId]);
        return {
            tagId,
            bookCount: results[0]?.count || 0,
            lastUsed: new Date().toISOString(),
        };
    }
    async hasBookTag(bookId, tagId) {
        const results = await this.db.all('SELECT COUNT(*) as count FROM book_tags WHERE book_id = ? AND tag_id = ?', [bookId, tagId]);
        return (results[0]?.count || 0) > 0;
    }
    async getUnusedTags() {
        const query = `
      SELECT t.* FROM tags t
      LEFT JOIN book_tags bt ON t.id = bt.tag_id
      WHERE bt.id IS NULL
      ORDER BY t.name
    `;
        return this.query(query);
    }
    async getBooksByTag(tagId, limit = 20) {
        const query = `
      SELECT DISTINCT b.* FROM books b
      INNER JOIN book_tags bt ON b.id = bt.book_id
      WHERE bt.tag_id = ? AND b.is_available = 1
      ORDER BY b.rating DESC
      LIMIT ?
    `;
        return this.db.all(query, [tagId, limit]);
    }
    async mergeTags(sourceTagId, targetTagId) {
        await this.db.run(`INSERT OR IGNORE INTO book_tags (book_id, tag_id)
       SELECT book_id, ? FROM book_tags WHERE tag_id = ?`, [targetTagId, sourceTagId]);
        await this.deleteTag(sourceTagId);
    }
    async getTagCount() {
        return this.count();
    }
    async getOrCreateTag(name) {
        const { normalizeTag } = await Promise.resolve().then(() => __importStar(require('../utils/tagValidator')));
        const normalized = normalizeTag(name);
        const existing = await this.getTagByName(normalized);
        if (existing && existing.id) {
            return existing.id;
        }
        return this.createTag(normalized);
    }
    async findByBookId(bookId) {
        return this.getBookTags(bookId);
    }
    async addTagToBook(bookId, tagId) {
        return this.addBookTag(bookId, tagId);
    }
    async deleteByBookId(bookId) {
        await this.clearBookTags(bookId);
        return 1;
    }
}
exports.TagRepository = TagRepository;
//# sourceMappingURL=TagRepository.js.map