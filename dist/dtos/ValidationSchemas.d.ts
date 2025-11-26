export interface ValidationError {
    field: string;
    message: string;
}
export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
}
export interface Validator<T> {
    validate(data: unknown): ValidationResult;
    validateAsync(data: unknown): Promise<ValidationResult>;
}
export declare const ValidationRules: {
    string: (value: unknown, options?: {
        minLength?: number;
        maxLength?: number;
    }) => boolean;
    number: (value: unknown, options?: {
        min?: number;
        max?: number;
        integer?: boolean;
    }) => boolean;
    boolean: (value: unknown) => boolean;
    email: (value: unknown) => boolean;
    url: (value: unknown) => boolean;
    rating: (value: unknown) => boolean;
    genre: (value: unknown) => boolean;
    array: (value: unknown, options?: {
        minLength?: number;
        maxLength?: number;
    }) => boolean;
    required: (value: unknown) => boolean;
    optional: () => boolean;
};
export declare const BookValidationSchema: {
    title: (value: unknown) => boolean;
    author: (value: unknown) => boolean;
    description: (value: unknown) => boolean;
    genre: (value: unknown) => boolean;
    cover_url: (value: unknown) => boolean;
    pdf_url: (value: unknown) => boolean;
    epub_url: (value: unknown) => boolean;
    rating: (value: unknown) => boolean;
    download_count: (value: unknown) => boolean;
    is_available: (value: unknown) => boolean;
};
export declare const UserValidationSchema: {
    username: (value: unknown) => boolean;
    first_name: (value: unknown) => boolean;
    last_name: (value: unknown) => boolean;
    is_admin: (value: unknown) => boolean;
    favorite_genres: (value: unknown) => boolean;
    language: (value: unknown) => boolean;
    user_id: (value: unknown) => boolean;
};
export declare const ReviewValidationSchema: {
    book_id: (value: unknown) => boolean;
    user_id: (value: unknown) => boolean;
    rating: (value: unknown) => boolean;
    comment: (value: unknown) => boolean;
    is_published: (value: unknown) => boolean;
};
export declare const AudioValidationSchema: {
    book_id: (value: unknown) => boolean;
    chapter_number: (value: unknown) => boolean;
    title: (value: unknown) => boolean;
    audio_url: (value: unknown) => boolean;
    duration: (value: unknown) => boolean;
    file_size: (value: unknown) => boolean;
    current_position: (value: unknown) => boolean;
};
export declare function validateAgainstSchema<T extends Record<string, unknown>>(data: unknown, schema: Record<string, (value: unknown) => boolean>): ValidationResult;
export declare function sanitizeString(input: string): string;
export declare function validatePaginationParams(limit?: number, offset?: number): {
    limit: number;
    offset: number;
};
export declare function validateSortParams(sortBy?: string, order?: string, allowedFields?: string[]): {
    sortBy: string;
    order: 'asc' | 'desc';
};
//# sourceMappingURL=ValidationSchemas.d.ts.map