"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateBookDTOClass = exports.CreateBookDTOClass = void 0;
class CreateBookDTOClass {
    constructor(data) {
        if (!data.title || data.title.trim().length < 2) {
            throw new Error('Title is required and must be at least 2 characters');
        }
        if (!data.author || data.author.trim().length < 2) {
            throw new Error('Author is required and must be at least 2 characters');
        }
        if (!data.genre || data.genre.trim().length < 2) {
            throw new Error('Genre is required and must be at least 2 characters');
        }
        if (data.rating !== undefined && (data.rating < 1 || data.rating > 5)) {
            throw new Error('Rating must be between 1 and 5');
        }
        if (data.download_count !== undefined && data.download_count < 0) {
            throw new Error('Download count cannot be negative');
        }
        this.title = data.title.trim();
        this.author = data.author.trim();
        this.description = data.description?.trim();
        this.genre = data.genre.trim();
        this.cover_url = data.cover_url;
        this.pdf_url = data.pdf_url;
        this.epub_url = data.epub_url;
        this.is_available = data.is_available ?? true;
        this.rating = data.rating;
        this.download_count = data.download_count ?? 0;
    }
}
exports.CreateBookDTOClass = CreateBookDTOClass;
class UpdateBookDTOClass {
    constructor(data) {
        if (data.title !== undefined && data.title.trim().length < 2) {
            throw new Error('Title must be at least 2 characters');
        }
        if (data.author !== undefined && data.author.trim().length < 2) {
            throw new Error('Author must be at least 2 characters');
        }
        if (data.genre !== undefined && data.genre.trim().length < 2) {
            throw new Error('Genre must be at least 2 characters');
        }
        if (data.rating !== undefined && (data.rating < 1 || data.rating > 5)) {
            throw new Error('Rating must be between 1 and 5');
        }
        if (data.download_count !== undefined && data.download_count < 0) {
            throw new Error('Download count cannot be negative');
        }
        this.title = data.title?.trim();
        this.author = data.author?.trim();
        this.description = data.description?.trim();
        this.genre = data.genre?.trim();
        this.cover_url = data.cover_url;
        this.pdf_url = data.pdf_url;
        this.epub_url = data.epub_url;
        this.is_available = data.is_available;
        this.rating = data.rating;
        this.download_count = data.download_count;
    }
}
exports.UpdateBookDTOClass = UpdateBookDTOClass;
//# sourceMappingURL=BookDTO.js.map