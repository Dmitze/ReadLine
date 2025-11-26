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
exports.getSmartRecommendations = exports.getContextualRecommendations = exports.getCollaborativeRecommendations = exports.getBooksBasedOnBehavior = exports.getUserReadingStats = exports.getRecommendedBooks = exports.getUserFavoriteGenres = exports.getRecentlyViewedBooks = exports.getRandomBook = void 0;
const models_1 = require("./models");
const logger_1 = require("../utils/logger");
const getRandomBook = () => {
    return new Promise((resolve, reject) => {
        logger_1.logger.debug('Getting random book');
        models_1.db.get('SELECT * FROM books WHERE (is_available = 1 OR is_available IS NULL) ORDER BY RANDOM() LIMIT 1', (err, row) => {
            if (err) {
                logger_1.logger.error('Error getting random book', err instanceof Error ? err : new Error(String(err)));
                reject(err);
                return;
            }
            if (row) {
                logger_1.logger.debug('Random book selected', { title: row.title, author: row.author });
                row.is_available = true;
                resolve(row);
            }
            else {
                logger_1.logger.warn('No available books in database');
                resolve(null);
            }
        });
    });
};
exports.getRandomBook = getRandomBook;
const getRecentlyViewedBooks = (userId, limit = 5) => {
    return new Promise((resolve, reject) => {
        models_1.db.all(`SELECT b.* FROM books b
       INNER JOIN saved_books sb ON b.id = sb.book_id
       WHERE sb.user_id = ?
       ORDER BY sb.created_at DESC
       LIMIT ?`, [userId, limit], (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows);
        });
    });
};
exports.getRecentlyViewedBooks = getRecentlyViewedBooks;
const getUserFavoriteGenres = (userId, limit = 3) => {
    return new Promise((resolve, reject) => {
        models_1.db.all(`SELECT b.genre, COUNT(*) as count
       FROM books b
       INNER JOIN saved_books sb ON b.id = sb.book_id
       WHERE sb.user_id = ?
       GROUP BY b.genre
       ORDER BY count DESC
       LIMIT ?`, [userId, limit], (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows.map((r) => r.genre));
        });
    });
};
exports.getUserFavoriteGenres = getUserFavoriteGenres;
const getRecommendedBooks = (userId, limit = 5) => {
    return new Promise(async (resolve, reject) => {
        try {
            const favoriteGenres = await (0, exports.getUserFavoriteGenres)(userId, 3);
            if (favoriteGenres.length === 0) {
                const topBooks = await (0, models_1.getTopBooks)(limit);
                resolve(topBooks);
                return;
            }
            const placeholders = favoriteGenres.map(() => '?').join(',');
            models_1.db.all(`SELECT * FROM books 
         WHERE genre IN (${placeholders}) 
         AND is_available = 1
         AND id NOT IN (SELECT book_id FROM saved_books WHERE user_id = ?)
         ORDER BY rating DESC, downloads_count DESC
         LIMIT ?`, [...favoriteGenres, userId, limit], (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
        }
        catch (error) {
            reject(error);
        }
    });
};
exports.getRecommendedBooks = getRecommendedBooks;
const getUserReadingStats = (userId) => {
    return new Promise(async (resolve, reject) => {
        try {
            const savedCount = await new Promise((res, rej) => {
                models_1.db.get('SELECT COUNT(*) as count FROM saved_books WHERE user_id = ?', [userId], (err, row) => {
                    if (err)
                        rej(err);
                    else
                        res(row.count);
                });
            });
            const reviewsCount = await new Promise((res, rej) => {
                models_1.db.get('SELECT COUNT(*) as count FROM reviews WHERE user_id = ?', [userId], (err, row) => {
                    if (err)
                        rej(err);
                    else
                        res(row.count);
                });
            });
            const favoriteGenres = await (0, exports.getUserFavoriteGenres)(userId, 5);
            resolve({ savedCount, reviewsCount, favoriteGenres });
        }
        catch (error) {
            reject(error);
        }
    });
};
exports.getUserReadingStats = getUserReadingStats;
const getBooksBasedOnBehavior = (userId, limit = 10) => {
    return new Promise((resolve, reject) => {
        models_1.db.all(`SELECT b.*, 
              (SELECT COUNT(*) FROM saved_books WHERE book_id = b.id) as save_count,
              (SELECT AVG(rating) FROM reviews WHERE book_id = b.id) as avg_rating
       FROM books b
       WHERE b.genre IN (
         SELECT DISTINCT b2.genre 
         FROM books b2
         INNER JOIN saved_books sb ON b2.id = sb.book_id
         WHERE sb.user_id = ?
       )
       AND b.is_available = 1
       AND b.id NOT IN (SELECT book_id FROM saved_books WHERE user_id = ?)
       ORDER BY save_count DESC, avg_rating DESC, b.downloads_count DESC
       LIMIT ?`, [userId, userId, limit], (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            if (rows && rows.length > 0) {
                resolve(rows);
            }
            else {
                models_1.db.all(`SELECT b.*, 
                    (SELECT COUNT(*) FROM saved_books WHERE book_id = b.id) as save_count,
                    (SELECT AVG(rating) FROM reviews WHERE book_id = b.id) as avg_rating
             FROM books b
             WHERE b.is_available = 1
             AND b.id NOT IN (SELECT book_id FROM saved_books WHERE user_id = ?)
             ORDER BY b.rating DESC, b.downloads_count DESC
             LIMIT ?`, [userId, limit], (err2, rows2) => {
                    if (err2)
                        reject(err2);
                    else
                        resolve(rows2 || []);
                });
            }
        });
    });
};
exports.getBooksBasedOnBehavior = getBooksBasedOnBehavior;
const getCollaborativeRecommendations = (userId, limit = 10) => {
    return new Promise((resolve, reject) => {
        models_1.db.all(`SELECT b.*, COUNT(DISTINCT sb2.user_id) as similar_users
       FROM books b
       INNER JOIN saved_books sb2 ON b.id = sb2.book_id
       WHERE sb2.user_id IN (
         -- Find users with similar taste
         SELECT sb1.user_id
         FROM saved_books sb1
         WHERE sb1.book_id IN (
           SELECT book_id FROM saved_books WHERE user_id = ?
         )
         AND sb1.user_id != ?
         GROUP BY sb1.user_id
         HAVING COUNT(*) >= 2
       )
       AND b.id NOT IN (SELECT book_id FROM saved_books WHERE user_id = ?)
       AND b.is_available = 1
       GROUP BY b.id
       ORDER BY similar_users DESC, b.rating DESC
       LIMIT ?`, [userId, userId, userId, limit], (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows);
        });
    });
};
exports.getCollaborativeRecommendations = getCollaborativeRecommendations;
const getContextualRecommendations = (userId, limit = 5) => {
    return (async () => {
        const hour = new Date().getHours();
        const { TIME_OF_DAY } = await Promise.resolve().then(() => __importStar(require('../constants')));
        let genrePreference = [];
        if (hour >= TIME_OF_DAY.MORNING_START && hour < TIME_OF_DAY.AFTERNOON_START) {
            genrePreference = ['Мотиваційна', 'Бізнес', 'Саморозвиток', 'Наукова'];
        }
        else if (hour >= TIME_OF_DAY.AFTERNOON_START && hour < TIME_OF_DAY.EVENING_START) {
            genrePreference = ['Історична', 'Біографія', 'Пригоди', 'Детектив'];
        }
        else if (hour >= TIME_OF_DAY.EVENING_START && hour < TIME_OF_DAY.NIGHT_START) {
            genrePreference = ['Романтика', 'Комедія', 'Фентезі', 'Сучасна проза'];
        }
        else {
            genrePreference = ['Поезія', 'Філософія', 'Класична література'];
        }
        return new Promise((resolve, reject) => {
            const placeholders = genrePreference.map(() => '?').join(',');
            models_1.db.all(`SELECT * FROM books 
       WHERE genre IN (${placeholders})
       AND is_available = 1
       AND id NOT IN (SELECT book_id FROM saved_books WHERE user_id = ?)
       ORDER BY rating DESC, downloads_count DESC
       LIMIT ?`, [...genrePreference, userId, limit], (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
        });
    })();
};
exports.getContextualRecommendations = getContextualRecommendations;
const getSmartRecommendations = async (userId, limit = 10) => {
    try {
        const allRecommendations = [];
        const seenIds = new Set();
        const behaviorCount = Math.ceil(limit * 0.4);
        const collaborativeCount = Math.ceil(limit * 0.3);
        const contextualCount = limit - behaviorCount - collaborativeCount;
        const behaviorBooks = await (0, exports.getBooksBasedOnBehavior)(userId, behaviorCount);
        for (const book of behaviorBooks) {
            if (!seenIds.has(book.id)) {
                seenIds.add(book.id);
                allRecommendations.push(book);
            }
        }
        const collaborativeBooks = await (0, exports.getCollaborativeRecommendations)(userId, collaborativeCount);
        for (const book of collaborativeBooks) {
            if (!seenIds.has(book.id)) {
                seenIds.add(book.id);
                allRecommendations.push(book);
            }
        }
        const contextualBooks = await (0, exports.getContextualRecommendations)(userId, contextualCount);
        for (const book of contextualBooks) {
            if (!seenIds.has(book.id)) {
                seenIds.add(book.id);
                allRecommendations.push(book);
            }
        }
        if (allRecommendations.length < limit) {
            const topBooks = await (0, models_1.getTopBooks)(limit - allRecommendations.length);
            for (const book of topBooks) {
                if (!seenIds.has(book.id)) {
                    seenIds.add(book.id);
                    allRecommendations.push(book);
                }
            }
        }
        if (allRecommendations.length < limit) {
            const newestBooks = await new Promise((resolve, reject) => {
                models_1.db.all(`SELECT * FROM books 
           WHERE is_available = 1
           AND id NOT IN (SELECT book_id FROM saved_books WHERE user_id = ?)
           ORDER BY created_at DESC
           LIMIT ?`, [userId, limit - allRecommendations.length], (err, rows) => {
                    if (err)
                        reject(err);
                    else
                        resolve(rows || []);
                });
            });
            for (const book of newestBooks) {
                if (!seenIds.has(book.id)) {
                    seenIds.add(book.id);
                    allRecommendations.push(book);
                }
            }
        }
        return allRecommendations.slice(0, limit);
    }
    catch (error) {
        logger_1.logger.error('Error getting smart recommendations', error instanceof Error ? error : new Error(String(error)));
        return (0, exports.getRecommendedBooks)(userId, limit);
    }
};
exports.getSmartRecommendations = getSmartRecommendations;
//# sourceMappingURL=recommendationFunctions.js.map