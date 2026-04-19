"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTopBooksWithPagination = exports.getBooksSortedByTitle = exports.getMostDownloadedBooksWithPagination = exports.getMostDownloadedBooks = exports.getBooksWithAudioWithPagination = exports.getNewestBooksWithPagination = exports.getHighRatedBooksWithPagination = exports.getHighRatedBooks = exports.getBooksWithAudio = exports.getBooksWithFilters = void 0;
const models_1 = require("./models");
const helpers_1 = require("../utils/helpers");
const QueryBuilder_1 = require("./QueryBuilder");
const logger_1 = require("../utils/logger");
const getBooksWithFilters = async (filters) => {
    const qb = new QueryBuilder_1.QueryBuilder().from('books').where('is_available', '=', 1);
    if (filters.genre) {
        qb.where('genre', '=', filters.genre);
    }
    if (filters.hasAudio) {
        qb.where('audio_file_id', 'IS NOT NULL').or('audio_external_link', 'IS NOT NULL');
    }
    if (filters.minRating !== undefined) {
        const safeMinRating = (0, helpers_1.safeParseFloat)(filters.minRating, 0);
        if (safeMinRating >= 0 && safeMinRating <= 5) {
            qb.where('rating', '>=', safeMinRating);
        }
    }
    const sortBy = filters.sortBy || 'date';
    const sortOrder = (filters.sortOrder || 'desc').toUpperCase();
    switch (sortBy) {
        case 'rating':
            qb.orderBy('rating', sortOrder).orderBy('reviews_count', 'DESC');
            break;
        case 'date':
            qb.orderBy('created_at', sortOrder);
            break;
        case 'title':
            qb.orderBy('title', sortOrder);
            break;
        case 'downloads':
            qb.orderBy('downloads_count', sortOrder);
            break;
        default:
            qb.orderBy('created_at', 'DESC');
    }
    const countQuery = qb.clone().columns('COUNT(*) as total');
    const dataQuery = qb.limit(filters.limit || 10).offset(filters.offset || 0);
    const [totalResult, books] = await Promise.all([
        new Promise((resolve, reject) => {
            models_1.db.get(countQuery.build().sql, countQuery.getParameters(), (err, row) => {
                if (err)
                    reject(err);
                else
                    resolve(row);
            });
        }),
        new Promise((resolve, reject) => {
            models_1.db.all(dataQuery.build().sql, dataQuery.getParameters(), (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows || []);
            });
        }),
    ]);
    return { books, total: totalResult?.total || 0 };
};
exports.getBooksWithFilters = getBooksWithFilters;
const getBooksWithAudio = (limit = 10) => {
    return new Promise((resolve, reject) => {
        models_1.db.all(`SELECT * FROM books WHERE (
        audio_file_id IS NOT NULL 
        OR audio_external_link IS NOT NULL 
        OR file_type = 'audio'
      ) AND is_available = 1 ORDER BY created_at DESC LIMIT ?`, [limit], (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows);
        });
    });
};
exports.getBooksWithAudio = getBooksWithAudio;
const getHighRatedBooks = (minRating = 4, limit = 10) => {
    return new Promise((resolve, reject) => {
        models_1.db.all(`SELECT * FROM books WHERE rating >= ? AND is_available = 1
       ORDER BY rating DESC, reviews_count DESC LIMIT ?`, [minRating, limit], (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows);
        });
    });
};
exports.getHighRatedBooks = getHighRatedBooks;
const getHighRatedBooksWithPagination = (minRating = 4, limit = 10, offset = 0) => {
    return new Promise((resolve, reject) => {
        models_1.db.get('SELECT COUNT(*) as total FROM books WHERE rating >= ? AND is_available = 1', [minRating], (err, countRow) => {
            if (err) {
                reject(err);
                return;
            }
            models_1.db.all('SELECT * FROM books WHERE rating >= ? AND is_available = 1 ORDER BY rating DESC, reviews_count DESC LIMIT ? OFFSET ?', [minRating, limit, offset], (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve({ books: rows, total: countRow?.total || 0 });
            });
        });
    });
};
exports.getHighRatedBooksWithPagination = getHighRatedBooksWithPagination;
const getNewestBooksWithPagination = (limit = 10, offset = 0) => {
    return new Promise((resolve, reject) => {
        models_1.db.get('SELECT COUNT(*) as total FROM books WHERE is_available = 1', [], (err, countRow) => {
            if (err) {
                reject(err);
                return;
            }
            models_1.db.all('SELECT * FROM books WHERE is_available = 1 ORDER BY created_at DESC LIMIT ? OFFSET ?', [limit, offset], (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve({ books: rows, total: countRow?.total || 0 });
            });
        });
    });
};
exports.getNewestBooksWithPagination = getNewestBooksWithPagination;
const getBooksWithAudioWithPagination = (limit = 10, offset = 0) => {
    return new Promise((resolve, reject) => {
        models_1.db.get(`SELECT COUNT(*) as total FROM books WHERE (
        audio_file_id IS NOT NULL 
        OR audio_external_link IS NOT NULL 
        OR file_type = 'audio'
      ) AND is_available = 1`, [], (err, countRow) => {
            if (err) {
                reject(err);
                return;
            }
            models_1.db.all(`SELECT * FROM books WHERE (
            audio_file_id IS NOT NULL 
            OR audio_external_link IS NOT NULL 
            OR file_type = 'audio'
          ) AND is_available = 1 ORDER BY created_at DESC LIMIT ? OFFSET ?`, [limit, offset], (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve({ books: rows, total: countRow?.total || 0 });
            });
        });
    });
};
exports.getBooksWithAudioWithPagination = getBooksWithAudioWithPagination;
const getMostDownloadedBooks = (limit = 10) => {
    return new Promise((resolve, reject) => {
        const query = `
      SELECT * FROM books 
      WHERE downloads_count IS NOT NULL AND downloads_count > 0 
      ORDER BY downloads_count DESC 
      LIMIT ?
    `;
        models_1.db.all(query, [limit], (err, rows) => {
            if (err) {
                logger_1.logger.error('Error getting most downloaded books', err, { limit });
                reject(err);
            }
            else {
                resolve(rows || []);
            }
        });
    });
};
exports.getMostDownloadedBooks = getMostDownloadedBooks;
const getMostDownloadedBooksWithPagination = (limit = 10, offset = 0) => {
    return new Promise((resolve, reject) => {
        models_1.db.get('SELECT COUNT(*) as total FROM books WHERE is_available = 1', [], (err, countRow) => {
            if (err) {
                reject(err);
                return;
            }
            models_1.db.all('SELECT * FROM books WHERE is_available = 1 ORDER BY downloads_count DESC, created_at DESC LIMIT ? OFFSET ?', [limit, offset], (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve({ books: rows, total: countRow?.total || 0 });
            });
        });
    });
};
exports.getMostDownloadedBooksWithPagination = getMostDownloadedBooksWithPagination;
const getBooksSortedByTitle = (limit = 10, offset = 0) => {
    return new Promise((resolve, reject) => {
        models_1.db.get('SELECT COUNT(*) as total FROM books WHERE is_available = 1', [], (err, countRow) => {
            if (err) {
                reject(err);
                return;
            }
            models_1.db.all('SELECT * FROM books WHERE is_available = 1 ORDER BY title ASC LIMIT ? OFFSET ?', [limit, offset], (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve({ books: rows || [], total: countRow?.total || 0 });
            });
        });
    });
};
exports.getBooksSortedByTitle = getBooksSortedByTitle;
const getTopBooksWithPagination = (limit = 10, offset = 0) => {
    return new Promise((resolve, reject) => {
        models_1.db.get('SELECT COUNT(*) as total FROM books WHERE rating IS NOT NULL AND rating > 0', [], (err, countRow) => {
            if (err) {
                reject(err);
                return;
            }
            models_1.db.all('SELECT * FROM books WHERE rating IS NOT NULL AND rating > 0 ORDER BY rating DESC, reviews_count DESC LIMIT ? OFFSET ?', [limit, offset], (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve({ books: rows || [], total: countRow?.total || 0 });
            });
        });
    });
};
exports.getTopBooksWithPagination = getTopBooksWithPagination;
//# sourceMappingURL=catalogFunctions.js.map