"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InputSanitizer = void 0;
class InputSanitizer {
    static sanitizeString(value, options = {}) {
        let result = String(value);
        if (options.removeHtml !== false) {
            result = result
                .replace(this.scriptTags, '')
                .replace(this.eventHandlers, '')
                .replace(this.dangerousProtocols, '')
                .replace(this.htmlTags, '');
        }
        if (options.trim !== false) {
            result = result.trim();
        }
        if (options.uppercase) {
            result = result.toUpperCase();
        }
        else if (options.lowercase) {
            result = result.toLowerCase();
        }
        if (options.maxLength) {
            result = result.substring(0, options.maxLength);
        }
        if (options.replaceSpaces) {
            result = result.replace(/\s+/g, ' ');
        }
        return result;
    }
    static sanitizeForDatabase(value) {
        return this.sanitizeString(value, {
            removeHtml: true,
            trim: true,
            replaceSpaces: true,
        })
            .replace(/'/g, "''")
            .replace(/\\/g, '\\\\');
    }
    static sanitizeForHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
    }
    static sanitizeForUrl(value) {
        try {
            const url = new URL(value);
            return url.toString();
        }
        catch {
            return encodeURI(value);
        }
    }
    static sanitizeForJson(value) {
        return JSON.stringify(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\//g, '\\/');
    }
    static checkSqlInjection(value) {
        return this.sqlInjectionPatterns.some((pattern) => pattern.test(value));
    }
    static checkXss(value) {
        const xssPatterns = [
            this.scriptTags,
            this.eventHandlers,
            this.dangerousProtocols,
            /<iframe[^>]*>/gi,
            /<object[^>]*>/gi,
            /<embed[^>]*>/gi,
            /javascript:/gi,
            /data:text\/html/gi,
        ];
        return xssPatterns.some((pattern) => pattern.test(value));
    }
    static sanitizeObject(obj, options = {}) {
        if (obj === null || obj === undefined) {
            return obj;
        }
        if (typeof obj === 'string') {
            return this.sanitizeString(obj, options);
        }
        if (Array.isArray(obj)) {
            return obj.map((item) => this.sanitizeObject(item, options));
        }
        if (typeof obj === 'object') {
            const sanitized = {};
            for (const [key, value] of Object.entries(obj)) {
                sanitized[key] = this.sanitizeObject(value, options);
            }
            return sanitized;
        }
        return obj;
    }
    static removeInvisibleChars(value) {
        return String(value)
            .replace(/[\u200B-\u200D\uFEFF]/g, '')
            .replace(/[\u200E\u200F]/g, '')
            .replace(/[\u202A-\u202E]/g, '');
    }
    static normalizeUnicode(value) {
        return String(value).normalize('NFKC');
    }
    static removeControlChars(value) {
        return String(value).replace(/[\x00-\x1F\x7F]/g, '');
    }
    static doubleEncode(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
    }
    static sanitizeTelegramInput(value) {
        if (typeof value !== 'string') {
            return '';
        }
        return this.sanitizeString(value, {
            removeHtml: true,
            trim: true,
            replaceSpaces: true,
            maxLength: 4096,
        });
    }
    static sanitizeSearchQuery(value, maxLength = 100) {
        return this.sanitizeString(value, {
            removeHtml: true,
            trim: true,
            replaceSpaces: true,
            maxLength,
        }).replace(/[^\w\s-а-яіїєґА-ЯІЇЄҐ]/g, '');
    }
    static sanitizeFilePath(value) {
        return String(value)
            .replace(/\.\./g, '')
            .replace(/\\/g, '/')
            .replace(/\/+/g, '/')
            .replace(/^\//, '');
    }
    static sanitizeFileName(value) {
        return String(value)
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .replace(/\s+/g, '_')
            .replace(/\.+/g, '.')
            .replace(/_+/g, '_')
            .substring(0, 255);
    }
}
exports.InputSanitizer = InputSanitizer;
InputSanitizer.htmlTags = /<[^>]*>/g;
InputSanitizer.scriptTags = /<script[^>]*>.*?<\/script>/gi;
InputSanitizer.eventHandlers = /on\w+\s*=/gi;
InputSanitizer.dangerousProtocols = /javascript:|data:|vbscript:/gi;
InputSanitizer.sqlComments = /(--|#|\/\*|\*\/)/g;
InputSanitizer.sqlInjectionPatterns = [
    /('\s*(OR|AND)\s*'1'\s*=\s*'1)/gi,
    /("\s*(OR|AND)\s*"1"\s*=\s*"1)/gi,
    /(;\s*(DROP|DELETE|INSERT|UPDATE|CREATE|ALTER)\s)/gi,
    /(\bUNION\b.*\bSELECT\b)/gi,
    /(\bEXEC\b|\bEXECUTE\b)/gi,
];
//# sourceMappingURL=InputSanitizer.js.map