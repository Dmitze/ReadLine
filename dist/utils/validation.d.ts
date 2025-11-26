import { Book, Review } from '../database/models';
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
}
export declare function validateBookData(data: Partial<Omit<Book, 'id' | 'created_at'>>): ValidationResult;
export declare function validateReviewData(data: Partial<Omit<Review, 'id' | 'created_at'>>): ValidationResult;
export declare function validateSearchQuery(query: string): ValidationResult;
export declare function isValidUrl(url: string): boolean;
export declare function isValidPhoneNumber(phone: string): boolean;
export declare function sanitizeText(text: string): string;
export declare function truncateText(text: string, maxLength: number): string;
//# sourceMappingURL=validation.d.ts.map