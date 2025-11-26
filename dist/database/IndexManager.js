"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndexManager = exports.INDEX_SPECS = void 0;
const logger_1 = require("../utils/logger");
exports.INDEX_SPECS = [
    {
        tableName: 'books',
        indexName: 'idx_books_genre',
        columns: ['genre'],
        description: 'Fast filtering by genre',
    },
    {
        tableName: 'books',
        indexName: 'idx_books_author',
        columns: ['author'],
        description: 'Fast filtering by author',
    },
    {
        tableName: 'books',
        indexName: 'idx_books_rating',
        columns: ['rating'],
        description: 'Fast ordering by rating',
    },
    {
        tableName: 'books',
        indexName: 'idx_books_created_at',
        columns: ['created_at'],
        description: 'Fast ordering by creation date',
    },
    {
        tableName: 'books',
        indexName: 'idx_books_is_available',
        columns: ['is_available'],
        description: 'Fast filtering by availability',
    },
    {
        tableName: 'books',
        indexName: 'idx_books_genre_rating',
        columns: ['genre', 'rating'],
        description: 'Composite index for genre + rating queries',
    },
    {
        tableName: 'users',
        indexName: 'idx_users_telegram_id',
        columns: ['telegram_id'],
        unique: true,
        description: 'Fast user lookup by Telegram ID',
    },
    {
        tableName: 'users',
        indexName: 'idx_users_email',
        columns: ['email'],
        description: 'Fast user lookup by email',
    },
    {
        tableName: 'users',
        indexName: 'idx_users_language',
        columns: ['language'],
        description: 'Fast filtering by language',
    },
    {
        tableName: 'reviews',
        indexName: 'idx_reviews_book_id',
        columns: ['book_id'],
        description: 'Fast lookup of reviews by book',
    },
    {
        tableName: 'reviews',
        indexName: 'idx_reviews_user_id',
        columns: ['user_id'],
        description: 'Fast lookup of reviews by user',
    },
    {
        tableName: 'reviews',
        indexName: 'idx_reviews_book_user',
        columns: ['book_id', 'user_id'],
        unique: true,
        description: 'Prevent duplicate reviews',
    },
    {
        tableName: 'reviews',
        indexName: 'idx_reviews_created_at',
        columns: ['created_at'],
        description: 'Fast ordering by creation date',
    },
    {
        tableName: 'reviews',
        indexName: 'idx_reviews_is_approved',
        columns: ['is_approved'],
        description: 'Fast filtering by approval status',
    },
    {
        tableName: 'saved_books',
        indexName: 'idx_saved_books_user_id',
        columns: ['user_id'],
        description: 'Fast lookup of saved books by user',
    },
    {
        tableName: 'saved_books',
        indexName: 'idx_saved_books_book_id',
        columns: ['book_id'],
        description: 'Fast lookup of users who saved book',
    },
    {
        tableName: 'saved_books',
        indexName: 'idx_saved_books_user_book',
        columns: ['user_id', 'book_id'],
        unique: true,
        description: 'Prevent duplicate saved books',
    },
    {
        tableName: 'audio_books',
        indexName: 'idx_audio_books_book_id',
        columns: ['book_id'],
        description: 'Fast lookup of audio books by book ID',
    },
    {
        tableName: 'audio_books',
        indexName: 'idx_audio_books_status',
        columns: ['status'],
        description: 'Fast filtering by processing status',
    },
    {
        tableName: 'tags',
        indexName: 'idx_tags_name',
        columns: ['name'],
        unique: true,
        description: 'Fast tag lookup by name',
    },
    {
        tableName: 'feedback',
        indexName: 'idx_feedback_user_id',
        columns: ['user_id'],
        description: 'Fast lookup of feedback by user',
    },
    {
        tableName: 'feedback',
        indexName: 'idx_feedback_created_at',
        columns: ['created_at'],
        description: 'Fast ordering by creation date',
    },
    {
        tableName: 'feedback',
        indexName: 'idx_feedback_is_read',
        columns: ['is_read'],
        description: 'Fast filtering by read status',
    },
    {
        tableName: 'promo_codes',
        indexName: 'idx_promo_codes_code',
        columns: ['code'],
        unique: true,
        description: 'Fast promo code lookup',
    },
    {
        tableName: 'promo_codes',
        indexName: 'idx_promo_codes_is_active',
        columns: ['is_active'],
        description: 'Fast filtering by active status',
    },
    {
        tableName: 'book_tags',
        indexName: 'idx_book_tags_tag_id',
        columns: ['tag_id'],
        description: 'Fast lookup of books by tag',
    },
    {
        tableName: 'book_tags',
        indexName: 'idx_book_tags_book_id',
        columns: ['book_id'],
        description: 'Fast lookup of tags for a book',
    },
    {
        tableName: 'listening_progress',
        indexName: 'idx_listening_progress_user_id_book_id',
        columns: ['user_id', 'book_id'],
        unique: true,
        description: 'Fast lookup of user listening progress',
    },
    {
        tableName: 'listening_progress',
        indexName: 'idx_listening_progress_last_listened',
        columns: ['last_listened_at'],
        description: 'Fast cleanup of old listening records',
    },
    {
        tableName: 'book_requests',
        indexName: 'idx_book_requests_user_id_status',
        columns: ['user_id', 'status'],
        description: 'Fast filtering of user book requests by status',
    },
    {
        tableName: 'book_requests',
        indexName: 'idx_book_requests_status',
        columns: ['status'],
        description: 'Fast filtering by request status',
    },
];
class IndexManager {
    constructor(db) {
        this.db = db;
    }
    async createAllIndexes() {
        let created = 0;
        let skipped = 0;
        let errors = 0;
        logger_1.logger.info('Starting index creation...');
        for (const spec of exports.INDEX_SPECS) {
            try {
                const success = await this.createIndex(spec);
                if (success) {
                    created++;
                }
                else {
                    skipped++;
                }
            }
            catch (error) {
                errors++;
                logger_1.logger.error(`Error creating index ${spec.indexName}`, error instanceof Error ? error : new Error(String(error)));
            }
        }
        logger_1.logger.info(`Index creation complete: ${created} created, ${skipped} skipped, ${errors} errors`);
        return { created, skipped, errors };
    }
    async createIndex(spec) {
        try {
            const columnList = spec.columns.join(', ');
            const uniqueKeyword = spec.unique ? 'UNIQUE' : '';
            const query = `CREATE ${uniqueKeyword} INDEX IF NOT EXISTS ${spec.indexName} ON ${spec.tableName} (${columnList})`;
            await this.db.run(query, []);
            logger_1.logger.info(`Index created: ${spec.indexName} (${spec.description})`);
            return true;
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('already exists')) {
                logger_1.logger.debug(`Index already exists: ${spec.indexName}`);
                return false;
            }
            logger_1.logger.error(`Error creating index ${spec.indexName}`, error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async getTableIndexes(tableName) {
        try {
            const query = `PRAGMA index_list(${tableName})`;
            const indexes = await this.db.all(query, []);
            return indexes.map((idx) => idx.name);
        }
        catch (error) {
            logger_1.logger.error(`Error getting indexes for ${tableName}`, error instanceof Error ? error : new Error(String(error)));
            return [];
        }
    }
    async vacuum() {
        try {
            await this.db.run('VACUUM', []);
            logger_1.logger.info('Database vacuumed successfully');
        }
        catch (error) {
            logger_1.logger.error('Error vacuuming database', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async analyze() {
        try {
            await this.db.run('ANALYZE', []);
            logger_1.logger.info('Database analyzed successfully');
        }
        catch (error) {
            logger_1.logger.error('Error analyzing database', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async getDatabaseStats() {
        try {
            const pageCount = await this.db.get('PRAGMA page_count', []);
            const pageSize = await this.db.get('PRAGMA page_size', []);
            const freelistCount = await this.db.get('PRAGMA freelist_count', []);
            const totalSize = ((pageCount?.count || 0) * (pageSize?.page_size || 4096)) / 1024 / 1024;
            return {
                pageCount: pageCount?.count || 0,
                pageSize: pageSize?.page_size || 0,
                freelistCount: freelistCount?.freelist_count || 0,
                totalSize: Math.round(totalSize * 100) / 100,
            };
        }
        catch (error) {
            logger_1.logger.error('Error getting database stats', error instanceof Error ? error : new Error(String(error)));
            return {
                pageCount: 0,
                pageSize: 0,
                freelistCount: 0,
                totalSize: 0,
            };
        }
    }
}
exports.IndexManager = IndexManager;
//# sourceMappingURL=IndexManager.js.map