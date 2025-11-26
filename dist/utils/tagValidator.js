"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.splitCompoundTag = exports.sanitizeTag = exports.normalizeTag = exports.isValidTag = void 0;
const isValidTag = (tag) => {
    if (!tag || typeof tag !== 'string') {
        return false;
    }
    const trimmed = tag.trim();
    if (trimmed.length === 0 || trimmed.length > 50) {
        return false;
    }
    const words = trimmed.split(/\s+/);
    if (words.length > 2) {
        return false;
    }
    const validRegex = /^[\p{L}\p{N}\-']+$/u;
    for (const word of words) {
        if (!validRegex.test(word)) {
            return false;
        }
    }
    return true;
};
exports.isValidTag = isValidTag;
const normalizeTag = (tag) => {
    return tag
        .trim()
        .split(/\s+/)
        .map((word, index) => {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
        .join('_');
};
exports.normalizeTag = normalizeTag;
const sanitizeTag = (tag) => {
    if (!tag)
        return '';
    return tag
        .replace(/[^a-zA-Zа-яА-ЯіІїЇєЄґҐ0-9\s\-']/g, '')
        .trim()
        .substring(0, 50);
};
exports.sanitizeTag = sanitizeTag;
const splitCompoundTag = (tag) => {
    return tag
        .trim()
        .split(/[\s_]+/)
        .filter((word) => word.length > 0)
        .map((word) => (0, exports.normalizeTag)(word));
};
exports.splitCompoundTag = splitCompoundTag;
//# sourceMappingURL=tagValidator.js.map