"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeSqlParam = sanitizeSqlParam;
exports.sanitizeTag = sanitizeTag;
exports.sanitizeSearchQuery = sanitizeSearchQuery;
exports.sanitizeUsername = sanitizeUsername;
exports.sanitizeUrl = sanitizeUrl;
exports.escapeHtml = escapeHtml;
exports.escapeMarkdown = escapeMarkdown;
exports.sanitizeMessage = sanitizeMessage;
exports.sanitizePhoneNumber = sanitizePhoneNumber;
exports.sanitizeEmail = sanitizeEmail;
exports.sanitizeNumber = sanitizeNumber;
exports.sanitizeBoolean = sanitizeBoolean;
exports.sanitizeArray = sanitizeArray;
exports.sanitizeObject = sanitizeObject;
function sanitizeSqlParam(value) {
    if (!value)
        return '';
    return value
        .replace(/['";\\]/g, '')
        .replace(/--/g, '')
        .replace(/\/\*/g, '')
        .replace(/\*\//g, '')
        .trim();
}
function sanitizeTag(tag) {
    if (!tag)
        return '';
    return tag
        .replace(/[^a-zA-Zа-яА-ЯіІїЇєЄґҐ0-9\-_']/g, '')
        .trim()
        .substring(0, 50);
}
function sanitizeSearchQuery(query) {
    if (!query)
        return '';
    return query
        .replace(/[<>'"]/g, '')
        .replace(/[;\\]/g, '')
        .trim()
        .substring(0, 100);
}
function sanitizeUsername(username) {
    if (!username)
        return '';
    return username
        .replace(/[^a-zA-Z0-9_]/g, '')
        .trim()
        .substring(0, 32);
}
function sanitizeUrl(url) {
    if (!url)
        return null;
    try {
        const urlObj = new URL(url);
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
            return null;
        }
        if (url.includes('<') || url.includes('>') || url.includes('"')) {
            return null;
        }
        return url;
    }
    catch {
        return null;
    }
}
function escapeHtml(text) {
    if (!text)
        return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
function escapeMarkdown(text) {
    if (!text)
        return '';
    return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}
function sanitizeMessage(message, maxLength = 4000) {
    if (!message)
        return '';
    return message
        .replace(/<[^>]*>/g, '')
        .replace(/[<>]/g, '')
        .trim()
        .substring(0, maxLength);
}
function sanitizePhoneNumber(phone) {
    if (!phone)
        return null;
    const cleaned = phone.replace(/[^\d+]/g, '');
    const phoneRegex = /^(\+?38)?0\d{9}$/;
    if (!phoneRegex.test(cleaned)) {
        return null;
    }
    return cleaned;
}
function sanitizeEmail(email) {
    if (!email)
        return null;
    const cleaned = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleaned)) {
        return null;
    }
    return cleaned;
}
function sanitizeNumber(value, min, max) {
    const num = Number(value);
    if (isNaN(num)) {
        return null;
    }
    if (min !== undefined && num < min) {
        return null;
    }
    if (max !== undefined && num > max) {
        return null;
    }
    return num;
}
function sanitizeBoolean(value) {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        return value.toLowerCase() === 'true' || value === '1';
    }
    if (typeof value === 'number') {
        return value !== 0;
    }
    return false;
}
function sanitizeArray(arr, maxLength) {
    if (!Array.isArray(arr)) {
        return [];
    }
    const unique = [...new Set(arr)].filter((item) => item !== null && item !== undefined && item !== '');
    if (maxLength !== undefined) {
        return unique.slice(0, maxLength);
    }
    return unique;
}
function sanitizeObject(obj) {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value === null || value === undefined) {
            continue;
        }
        if (typeof value === 'string') {
            sanitized[key] = sanitizeMessage(value);
        }
        else if (typeof value === 'number') {
            sanitized[key] = value;
        }
        else if (typeof value === 'boolean') {
            sanitized[key] = value;
        }
        else if (Array.isArray(value)) {
            sanitized[key] = sanitizeArray(value);
        }
        else if (typeof value === 'object') {
            sanitized[key] = sanitizeObject(value);
        }
    }
    return sanitized;
}
//# sourceMappingURL=sanitization.js.map