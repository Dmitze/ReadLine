"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudioValidationSchema = exports.ReviewValidationSchema = exports.UserValidationSchema = exports.BookValidationSchema = exports.ValidationRules = void 0;
exports.validateAgainstSchema = validateAgainstSchema;
exports.sanitizeString = sanitizeString;
exports.validatePaginationParams = validatePaginationParams;
exports.validateSortParams = validateSortParams;
exports.ValidationRules = {
    string: (value, options) => {
        if (typeof value !== 'string')
            return false;
        if (options?.minLength && value.length < options.minLength)
            return false;
        if (options?.maxLength && value.length > options.maxLength)
            return false;
        return true;
    },
    number: (value, options) => {
        if (typeof value !== 'number')
            return false;
        if (options?.integer && !Number.isInteger(value))
            return false;
        if (options?.min !== undefined && value < options.min)
            return false;
        if (options?.max !== undefined && value > options.max)
            return false;
        return true;
    },
    boolean: (value) => {
        return typeof value === 'boolean';
    },
    email: (value) => {
        if (typeof value !== 'string')
            return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value);
    },
    url: (value) => {
        if (typeof value !== 'string')
            return false;
        try {
            new URL(value);
            return true;
        }
        catch {
            return false;
        }
    },
    rating: (value) => {
        return exports.ValidationRules.number(value, { min: 1, max: 5, integer: true });
    },
    genre: (value) => {
        const validGenres = [
            'fiction',
            'nonfiction',
            'mystery',
            'science-fiction',
            'fantasy',
            'romance',
            'thriller',
            'biography',
            'history',
            'self-help',
            'business',
            'technology',
            'other',
        ];
        return typeof value === 'string' && validGenres.includes(value.toLowerCase());
    },
    array: (value, options) => {
        if (!Array.isArray(value))
            return false;
        if (options?.minLength && value.length < options.minLength)
            return false;
        if (options?.maxLength && value.length > options.maxLength)
            return false;
        return true;
    },
    required: (value) => {
        if (value === null || value === undefined)
            return false;
        if (typeof value === 'string' && value.trim() === '')
            return false;
        return true;
    },
    optional: () => {
        return true;
    },
};
exports.BookValidationSchema = {
    title: (value) => {
        return exports.ValidationRules.string(value, { minLength: 1, maxLength: 255 });
    },
    author: (value) => {
        return exports.ValidationRules.string(value, { minLength: 1, maxLength: 255 });
    },
    description: (value) => {
        return exports.ValidationRules.optional() || exports.ValidationRules.string(value, { maxLength: 2000 });
    },
    genre: (value) => {
        return exports.ValidationRules.genre(value);
    },
    cover_url: (value) => {
        return exports.ValidationRules.optional() || exports.ValidationRules.url(value);
    },
    pdf_url: (value) => {
        return exports.ValidationRules.optional() || exports.ValidationRules.url(value);
    },
    epub_url: (value) => {
        return exports.ValidationRules.optional() || exports.ValidationRules.url(value);
    },
    rating: (value) => {
        return exports.ValidationRules.optional() || exports.ValidationRules.rating(value);
    },
    download_count: (value) => {
        return exports.ValidationRules.optional() || exports.ValidationRules.number(value, { min: 0, integer: true });
    },
    is_available: (value) => {
        return exports.ValidationRules.optional() || exports.ValidationRules.boolean(value);
    },
};
exports.UserValidationSchema = {
    username: (value) => {
        if (!exports.ValidationRules.optional() && value) {
            return exports.ValidationRules.string(value, { minLength: 1, maxLength: 100 });
        }
        return true;
    },
    first_name: (value) => {
        if (!exports.ValidationRules.optional() && value) {
            return exports.ValidationRules.string(value, { minLength: 1, maxLength: 100 });
        }
        return true;
    },
    last_name: (value) => {
        if (!exports.ValidationRules.optional() && value) {
            return exports.ValidationRules.string(value, { minLength: 1, maxLength: 100 });
        }
        return true;
    },
    is_admin: (value) => {
        return exports.ValidationRules.optional() || exports.ValidationRules.boolean(value);
    },
    favorite_genres: (value) => {
        return (exports.ValidationRules.optional() ||
            (exports.ValidationRules.array(value) && value.every((g) => exports.ValidationRules.genre(g))));
    },
    language: (value) => {
        const validLanguages = ['en', 'uk', 'ru'];
        return (exports.ValidationRules.optional() || (typeof value === 'string' && validLanguages.includes(value)));
    },
    user_id: (value) => {
        return exports.ValidationRules.number(value, { min: 1, integer: true });
    },
};
exports.ReviewValidationSchema = {
    book_id: (value) => {
        return exports.ValidationRules.number(value, { min: 1, integer: true });
    },
    user_id: (value) => {
        return exports.ValidationRules.number(value, { min: 1, integer: true });
    },
    rating: (value) => {
        return exports.ValidationRules.rating(value);
    },
    comment: (value) => {
        return exports.ValidationRules.optional() || exports.ValidationRules.string(value, { maxLength: 1000 });
    },
    is_published: (value) => {
        return exports.ValidationRules.optional() || exports.ValidationRules.boolean(value);
    },
};
exports.AudioValidationSchema = {
    book_id: (value) => {
        return exports.ValidationRules.number(value, { min: 1, integer: true });
    },
    chapter_number: (value) => {
        return exports.ValidationRules.number(value, { min: 1, integer: true });
    },
    title: (value) => {
        return exports.ValidationRules.string(value, { minLength: 1, maxLength: 255 });
    },
    audio_url: (value) => {
        return exports.ValidationRules.url(value);
    },
    duration: (value) => {
        return exports.ValidationRules.number(value, { min: 1, integer: true });
    },
    file_size: (value) => {
        return exports.ValidationRules.optional() || exports.ValidationRules.number(value, { min: 0, integer: true });
    },
    current_position: (value) => {
        return exports.ValidationRules.number(value, { min: 0, integer: true });
    },
};
function validateAgainstSchema(data, schema) {
    if (typeof data !== 'object' || data === null) {
        return {
            isValid: false,
            errors: [{ field: 'root', message: 'Data must be an object' }],
        };
    }
    const errors = [];
    const obj = data;
    for (const [field, validator] of Object.entries(schema)) {
        const value = obj[field];
        if (!validator(value)) {
            errors.push({
                field,
                message: `Invalid value for field: ${field}`,
            });
        }
    }
    return {
        isValid: errors.length === 0,
        errors,
    };
}
function sanitizeString(input) {
    return input
        .trim()
        .replace(/[<>]/g, '')
        .substring(0, 500);
}
function validatePaginationParams(limit, offset) {
    const validLimit = Math.min(Math.max(limit || 10, 1), 100);
    const validOffset = Math.max(offset || 0, 0);
    return { limit: validLimit, offset: validOffset };
}
function validateSortParams(sortBy, order, allowedFields) {
    const defaultSort = allowedFields?.[0] || 'id';
    const candidate = sortBy ?? '';
    const validSort = allowedFields && allowedFields.includes(candidate) ? candidate : defaultSort;
    const validOrder = (order?.toLowerCase() === 'desc' ? 'desc' : 'asc');
    return { sortBy: validSort, order: validOrder };
}
//# sourceMappingURL=ValidationSchemas.js.map