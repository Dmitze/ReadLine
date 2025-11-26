export declare const BookCreateSchema: {
    title: string[];
    author: string[];
    genre: string[];
    description: string[];
    file_type: string[];
    photo_file_id: string[];
    file_path: string[];
    file_size: string[];
};
export declare const BookUpdateSchema: {
    title: string[];
    author: string[];
    genre: string[];
    description: string[];
    photo_file_id: string[];
};
export declare const BookSearchSchema: {
    query: string[];
    genre: string[];
    limit: string[];
    offset: string[];
};
export declare const UserCreateSchema: {
    telegram_id: string[];
    username: string[];
    first_name: string[];
    last_name: string[];
    language: string[];
};
export declare const UserUpdateSchema: {
    username: string[];
    first_name: string[];
    last_name: string[];
    language: string[];
    is_admin: string[];
};
export declare const ReviewCreateSchema: {
    book_id: string[];
    user_id: string[];
    rating: string[];
    comment: string[];
};
export declare const ReviewUpdateSchema: {
    rating: string[];
    comment: string[];
};
export declare const AudioCreateSchema: {
    book_id: string[];
    file_id: string[];
    duration: string[];
    narrator: string[];
    quality: string[];
};
export declare const AudioUpdateSchema: {
    duration: string[];
    narrator: string[];
    quality: string[];
};
export declare const TagCreateSchema: {
    name: string[];
    description: string[];
};
export declare const TagUpdateSchema: {
    name: string[];
    description: string[];
};
export declare const PromoCodeCreateSchema: {
    code: string[];
    description: string[];
    promo_type: string[];
    is_active: string[];
};
export declare const SavedBookSchema: {
    book_id: string[];
    user_id: string[];
    collection: string[];
};
export declare const FeedbackCreateSchema: {
    content: string[];
    type: string[];
    telegram_username: string[];
};
export declare const FeedbackReplySchema: {
    message: string[];
};
export declare const PaginationSchema: {
    page: string[];
    limit: string[];
};
export declare const BookFilterSchema: {
    genre: string[];
    rating: string[];
    search: string[];
    sortBy: string[];
    limit: string[];
    offset: string[];
};
export declare function createBookValidation(): Record<string, string[]>;
export declare function updateUserValidation(): Record<string, string[]>;
export declare function searchValidation(): Record<string, string[]>;
export declare function ratingValidation(): Record<string, string[]>;
//# sourceMappingURL=ValidationSchemas.d.ts.map