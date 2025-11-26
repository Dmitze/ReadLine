export declare function sanitizeSqlParam(value: string): string;
export declare function sanitizeTag(tag: string): string;
export declare function sanitizeSearchQuery(query: string): string;
export declare function sanitizeUsername(username: string): string;
export declare function sanitizeUrl(url: string): string | null;
export declare function escapeHtml(text: string): string;
export declare function escapeMarkdown(text: string): string;
export declare function sanitizeMessage(message: string, maxLength?: number): string;
export declare function sanitizePhoneNumber(phone: string): string | null;
export declare function sanitizeEmail(email: string): string | null;
export declare function sanitizeNumber(value: unknown, min?: number, max?: number): number | null;
export declare function sanitizeBoolean(value: unknown): boolean;
export declare function sanitizeArray<T>(arr: T[], maxLength?: number): T[];
export declare function sanitizeObject<T extends Record<string, any>>(obj: T): T;
//# sourceMappingURL=sanitization.d.ts.map