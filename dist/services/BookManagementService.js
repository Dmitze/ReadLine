"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookManagementService = void 0;
exports.createBookManagementService = createBookManagementService;
const models_1 = require("../database/models");
const TagRepository_1 = require("../repositories/TagRepository");
const logger_1 = require("../utils/logger");
const validation_1 = require("../utils/validation");
const Result_1 = require("../core/Result");
class BookManagementService {
    constructor(db) {
        this.db = db;
        this.tagRepository = new TagRepository_1.TagRepository(db);
    }
    async createBook(bookData) {
        try {
            const validation = (0, validation_1.validateBookData)(bookData);
            if (!validation.isValid) {
                return (0, Result_1.err)(new Error(`Validation failed: ${validation.errors.join(', ')}`));
            }
            const bookDataForDb = {
                ...bookData,
                photo_file_id: bookData.photo_file_id || 'default_book_cover',
            };
            const bookId = await (0, models_1.addBook)(bookDataForDb);
            if (bookData.selectedTags && bookData.selectedTags.length > 0) {
                await this.tagRepository.addBookTags(bookId, bookData.selectedTags);
            }
            const book = {
                ...bookData,
                id: bookId,
                is_available: true,
                created_at: new Date().toISOString(),
            };
            logger_1.logger.info('Book created successfully', {
                bookId,
                title: bookData.title,
                author: bookData.author,
                formats: {
                    hasFile: !!bookData.file_url,
                    hasAudio: !!bookData.audio_file_id,
                    hasLink: !!bookData.online_link,
                },
                tagsCount: bookData.selectedTags?.length || 0,
            });
            return (0, Result_1.ok)({ bookId, book });
        }
        catch (error) {
            const errorObj = error instanceof Error ? error : new Error(String(error));
            logger_1.logger.error('Failed to create book', errorObj, {
                title: bookData.title,
                author: bookData.author,
            });
            return (0, Result_1.err)(errorObj);
        }
    }
    async bulkUpdateAvailability(bookIds, available, adminId) {
        try {
            const errors = [];
            let successCount = 0;
            for (const bookId of bookIds) {
                try {
                    await this.db.run('UPDATE books SET is_available = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [available ? 1 : 0, bookId]);
                    successCount++;
                    logger_1.logger.info('Book availability updated', {
                        bookId,
                        available,
                        adminId,
                    });
                }
                catch (error) {
                    const errMsg = error instanceof Error ? error.message : String(error);
                    errors.push(`Book ${bookId}: ${errMsg}`);
                    logger_1.logger.error('Failed to update book availability', error instanceof Error ? error : new Error(String(error)), {
                        bookId,
                        available,
                        adminId,
                    });
                }
            }
            return (0, Result_1.ok)({
                success: errors.length === 0,
                count: successCount,
                errors,
            });
        }
        catch (error) {
            const errMsg = error instanceof Error ? error : new Error(String(error));
            logger_1.logger.error('Failed to bulk update book availability', errMsg, {
                bookIds,
                available,
                adminId,
            });
            return (0, Result_1.err)(errMsg);
        }
    }
    async bulkDeleteBooks(bookIds, adminId) {
        try {
            const errors = [];
            let successCount = 0;
            for (const bookId of bookIds) {
                try {
                    await this.db.run('DELETE FROM books WHERE id = ?', [bookId]);
                    successCount++;
                    logger_1.logger.info('Book deleted', {
                        bookId,
                        adminId,
                    });
                }
                catch (error) {
                    const errMsg = error instanceof Error ? error.message : String(error);
                    errors.push(`Book ${bookId}: ${errMsg}`);
                    logger_1.logger.error('Failed to delete book', error instanceof Error ? error : new Error(String(error)), {
                        bookId,
                        adminId,
                    });
                }
            }
            return (0, Result_1.ok)({
                success: errors.length === 0,
                count: successCount,
                errors,
            });
        }
        catch (error) {
            const errMsg = error instanceof Error ? error : new Error(String(error));
            logger_1.logger.error('Failed to bulk delete books', errMsg, {
                bookIds,
                adminId,
            });
            return (0, Result_1.err)(errMsg);
        }
    }
    validateBookData(bookData) {
        const errors = [];
        if (!bookData.title?.trim()) {
            errors.push('Назва книги обов\'язкова');
        }
        if (!bookData.author?.trim()) {
            errors.push('Автор обов\'язковий');
        }
        if (!bookData.genre?.trim()) {
            errors.push('Жанр обов\'язковий');
        }
        if (!bookData.description?.trim()) {
            errors.push('Опис обов\'язковий');
        }
        if (bookData.title && bookData.title.length > 500) {
            errors.push('Назва книги занадто довга (макс. 500 символів)');
        }
        if (bookData.author && bookData.author.length > 300) {
            errors.push('Ім\'я автора занадто довге (макс. 300 символів)');
        }
        if (bookData.description && bookData.description.length > 5000) {
            errors.push('Опис занадто довгий (макс. 5000 символів)');
        }
        if (errors.length > 0) {
            return (0, Result_1.err)(errors);
        }
        return (0, Result_1.ok)(true);
    }
    async canUserAddBook(userId) {
        return (0, Result_1.ok)(true);
    }
    async getUserBookStats(userId) {
        try {
            return (0, Result_1.ok)({
                totalBooks: 0,
                publishedBooks: 0,
                pendingBooks: 0,
            });
        }
        catch (error) {
            return (0, Result_1.err)(error instanceof Error ? error : new Error(String(error)));
        }
    }
}
exports.BookManagementService = BookManagementService;
function createBookManagementService(db) {
    return new BookManagementService(db);
}
//# sourceMappingURL=BookManagementService.js.map