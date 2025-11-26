"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBookData = validateBookData;
exports.validateReviewData = validateReviewData;
exports.validateSearchQuery = validateSearchQuery;
exports.isValidUrl = isValidUrl;
exports.isValidPhoneNumber = isValidPhoneNumber;
exports.sanitizeText = sanitizeText;
exports.truncateText = truncateText;
const constants_1 = require("../constants");
function validateBookData(data) {
    const errors = [];
    if (!data.title || data.title.trim().length === 0) {
        errors.push("Назва книги обов'язкова");
    }
    else if (data.title.length < constants_1.VALIDATION.TITLE_MIN) {
        errors.push(`Назва занадто коротка (мінімум ${constants_1.VALIDATION.TITLE_MIN} символи)`);
    }
    else if (data.title.length > constants_1.VALIDATION.TITLE_MAX) {
        errors.push(`Назва книги занадто довга (максимум ${constants_1.VALIDATION.TITLE_MAX} символів)`);
    }
    if (!data.author || data.author.trim().length === 0) {
        errors.push("Автор обов'язковий");
    }
    else if (data.author.length < constants_1.VALIDATION.AUTHOR_MIN) {
        errors.push(`Ім\'я автора занадто коротке (мінімум ${constants_1.VALIDATION.AUTHOR_MIN} символи)`);
    }
    else if (data.author.length > constants_1.VALIDATION.AUTHOR_MAX) {
        errors.push(`Ім\'я автора занадто довге (максимум ${constants_1.VALIDATION.AUTHOR_MAX} символів)`);
    }
    if (!data.genre || data.genre.trim().length === 0) {
        errors.push("Жанр обов'язковий");
    }
    if (!data.description || data.description.trim().length === 0) {
        errors.push("Опис обов'язковий");
    }
    else if (data.description.length < constants_1.VALIDATION.DESCRIPTION_MIN) {
        errors.push(`Опис занадто короткий (мінімум ${constants_1.VALIDATION.DESCRIPTION_MIN} символів)`);
    }
    else if (data.description.length > constants_1.VALIDATION.DESCRIPTION_MAX) {
        errors.push(`Опис занадто довгий (максимум ${constants_1.VALIDATION.DESCRIPTION_MAX} символів)`);
    }
    if (!data.photo_file_id || data.photo_file_id.trim().length === 0) {
        errors.push("Фото обкладинки обов'язкове");
    }
    if (data.file_type && !['physical', 'link', 'file'].includes(data.file_type)) {
        errors.push('Невірний тип файлу');
    }
    if (data.file_type === 'link' && data.file_url) {
        if (!isValidUrl(data.file_url)) {
            errors.push('Невірний формат посилання');
        }
    }
    return {
        isValid: errors.length === 0,
        errors,
    };
}
function validateReviewData(data) {
    const errors = [];
    if (!data.book_id || data.book_id <= 0) {
        errors.push("ID книги обов'язковий");
    }
    if (!data.user_id || data.user_id <= 0) {
        errors.push("ID користувача обов'язковий");
    }
    if (!data.rating || data.rating < constants_1.VALIDATION.RATING_MIN || data.rating > constants_1.VALIDATION.RATING_MAX) {
        errors.push(`Рейтинг має бути від ${constants_1.VALIDATION.RATING_MIN} до ${constants_1.VALIDATION.RATING_MAX}`);
    }
    if (data.comment) {
        if (data.comment.length > constants_1.VALIDATION.COMMENT_MAX) {
            errors.push(`Коментар занадто довгий (максимум ${constants_1.VALIDATION.COMMENT_MAX} символів)`);
        }
        if (data.comment.trim().length === 0) {
            errors.push('Коментар не може бути порожнім');
        }
    }
    return {
        isValid: errors.length === 0,
        errors,
    };
}
function validateSearchQuery(query) {
    const errors = [];
    if (!query || query.trim().length === 0) {
        errors.push('Пошуковий запит не може бути порожнім');
    }
    if (query.length < constants_1.CONFIG.MIN_SEARCH_LENGTH) {
        errors.push(`Пошуковий запит занадто короткий (мінімум ${constants_1.CONFIG.MIN_SEARCH_LENGTH} символи)`);
    }
    if (query.length > constants_1.CONFIG.MAX_SEARCH_LENGTH) {
        errors.push(`Пошуковий запит занадто довгий (максимум ${constants_1.CONFIG.MAX_SEARCH_LENGTH} символів)`);
    }
    return {
        isValid: errors.length === 0,
        errors,
    };
}
function isValidUrl(url) {
    try {
        const urlObject = new URL(url);
        return urlObject.protocol === 'http:' || urlObject.protocol === 'https:';
    }
    catch {
        return false;
    }
}
function isValidPhoneNumber(phone) {
    const phoneRegex = /^(\+?38)?0\d{9}$|^(\+?38)?0\d{2}-\d{3}-\d{2}-\d{2}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
}
function sanitizeText(text) {
    return text
        .trim()
        .replace(/<[^>]*>/g, '')
        .replace(/[<>]/g, '');
}
function truncateText(text, maxLength) {
    if (text.length <= maxLength) {
        return text;
    }
    return text.substring(0, maxLength - 3) + '...';
}
//# sourceMappingURL=validation.js.map