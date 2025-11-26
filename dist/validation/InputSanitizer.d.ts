export interface SanitizeOptions {
    trim?: boolean;
    lowercase?: boolean;
    uppercase?: boolean;
    removeHtml?: boolean;
    removeSpecialChars?: boolean;
    maxLength?: number;
    replaceSpaces?: boolean;
}
export declare class InputSanitizer {
    private static readonly htmlTags;
    private static readonly scriptTags;
    private static readonly eventHandlers;
    private static readonly dangerousProtocols;
    private static readonly sqlComments;
    private static readonly sqlInjectionPatterns;
    static sanitizeString(value: string, options?: SanitizeOptions): string;
    static sanitizeForDatabase(value: string): string;
    static sanitizeForHtml(value: string): string;
    static sanitizeForUrl(value: string): string;
    static sanitizeForJson(value: unknown): string;
    static checkSqlInjection(value: string): boolean;
    static checkXss(value: string): boolean;
    static sanitizeObject(obj: unknown, options?: SanitizeOptions): unknown;
    static removeInvisibleChars(value: string): string;
    static normalizeUnicode(value: string): string;
    static removeControlChars(value: string): string;
    static doubleEncode(value: string): string;
    static sanitizeTelegramInput(value: unknown): string;
    static sanitizeSearchQuery(value: string, maxLength?: number): string;
    static sanitizeFilePath(value: string): string;
    static sanitizeFileName(value: string): string;
}
//# sourceMappingURL=InputSanitizer.d.ts.map