"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBookDetailedStats = void 0;
const db_1 = require("./db");
const logger_1 = require("../../utils/logger");
const getBookDetailedStats = (bookId) => {
    return new Promise(async (resolve, reject) => {
        try {
            const book = await new Promise((res, rej) => {
                db_1.db.get('SELECT * FROM books WHERE id = ?', [bookId], (err, row) => {
                    if (err)
                        rej(err);
                    else
                        res(row);
                });
            });
            if (!book) {
                reject(new Error(`Book with id ${bookId} not found`));
                return;
            }
            const ratingDistribution = await new Promise((res, rej) => {
                db_1.db.all(`SELECT rating, COUNT(*) as count FROM reviews 
           WHERE book_id = ? AND is_published = 1 
           GROUP BY rating`, [bookId], (err, rows) => {
                    if (err)
                        rej(err);
                    else {
                        const distribution = {
                            rating_1_count: 0,
                            rating_2_count: 0,
                            rating_3_count: 0,
                            rating_4_count: 0,
                            rating_5_count: 0,
                        };
                        if (rows && rows.length > 0) {
                            const totalReviews = rows.reduce((sum, r) => sum + r.count, 0);
                            rows.forEach((row) => {
                                const key = `rating_${row.rating}_count`;
                                distribution[key] = row.count;
                            });
                            res({ ...distribution, totalReviews });
                        }
                        else {
                            res({ ...distribution, totalReviews: 0 });
                        }
                    }
                });
            });
            const readersCount = await new Promise((res, rej) => {
                db_1.db.get('SELECT COUNT(*) as count FROM saved_books WHERE book_id = ?', [bookId], (err, row) => {
                    if (err)
                        rej(err);
                    else
                        res(row?.count || 0);
                });
            });
            const popularQuotes = await new Promise((res, rej) => {
                db_1.db.all(`SELECT comment FROM reviews 
           WHERE book_id = ? AND is_published = 1 AND comment IS NOT NULL 
           ORDER BY rating DESC LIMIT 5`, [bookId], (err, rows) => {
                    if (err)
                        rej(err);
                    else
                        res((rows || []).map((r) => r.comment).filter((c) => c && c.length > 0));
                });
            });
            const result = {
                book,
                rating_stats: ratingDistribution,
                readers_count: readersCount,
                popular_quotes: popularQuotes,
            };
            logger_1.logger.info('Book detailed stats retrieved', { bookId });
            resolve(result);
        }
        catch (error) {
            logger_1.logger.error('Error getting book detailed stats', error, { bookId });
            reject(error);
        }
    });
};
exports.getBookDetailedStats = getBookDetailedStats;
//# sourceMappingURL=stats.js.map