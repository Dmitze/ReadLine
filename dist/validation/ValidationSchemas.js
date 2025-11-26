"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookFilterSchema = exports.PaginationSchema = exports.FeedbackReplySchema = exports.FeedbackCreateSchema = exports.SavedBookSchema = exports.PromoCodeCreateSchema = exports.TagUpdateSchema = exports.TagCreateSchema = exports.AudioUpdateSchema = exports.AudioCreateSchema = exports.ReviewUpdateSchema = exports.ReviewCreateSchema = exports.UserUpdateSchema = exports.UserCreateSchema = exports.BookSearchSchema = exports.BookUpdateSchema = exports.BookCreateSchema = void 0;
exports.createBookValidation = createBookValidation;
exports.updateUserValidation = updateUserValidation;
exports.searchValidation = searchValidation;
exports.ratingValidation = ratingValidation;
const Validator_1 = require("./Validator");
exports.BookCreateSchema = {
    title: ['required', 'string', 'min:1', 'max:255'],
    author: ['required', 'string', 'min:1', 'max:255'],
    genre: ['required', 'string', 'min:1', 'max:100'],
    description: ['required', 'string', 'min:10', 'max:5000'],
    file_type: ['required', 'in:physical:file:audio:link'],
    photo_file_id: ['string', 'max:255'],
    file_path: ['string', 'max:1000'],
    file_size: ['number'],
};
exports.BookUpdateSchema = {
    title: ['string', 'min:1', 'max:255'],
    author: ['string', 'min:1', 'max:255'],
    genre: ['string', 'min:1', 'max:100'],
    description: ['string', 'min:10', 'max:5000'],
    photo_file_id: ['string', 'max:255'],
};
exports.BookSearchSchema = {
    query: ['string', 'max:255'],
    genre: ['string', 'max:100'],
    limit: ['number', 'min:1', 'max:100'],
    offset: ['number', 'min:0'],
};
exports.UserCreateSchema = {
    telegram_id: ['required', 'number'],
    username: ['string', 'username', 'min:3', 'max:32'],
    first_name: ['string', 'max:255'],
    last_name: ['string', 'max:255'],
    language: ['in:uk:en:ru'],
};
exports.UserUpdateSchema = {
    username: ['string', 'username', 'min:3', 'max:32'],
    first_name: ['string', 'max:255'],
    last_name: ['string', 'max:255'],
    language: ['in:uk:en:ru'],
    is_admin: ['boolean'],
};
exports.ReviewCreateSchema = {
    book_id: ['required', 'number', 'min:1'],
    user_id: ['required', 'number', 'min:1'],
    rating: ['required', 'number', 'in:1:2:3:4:5'],
    comment: ['string', 'max:2000'],
};
exports.ReviewUpdateSchema = {
    rating: ['number', 'in:1:2:3:4:5'],
    comment: ['string', 'max:2000'],
};
exports.AudioCreateSchema = {
    book_id: ['required', 'number', 'min:1'],
    file_id: ['required', 'string', 'min:1', 'max:255'],
    duration: ['required', 'number', 'min:1'],
    narrator: ['string', 'max:255'],
    quality: ['in:low:medium:high'],
};
exports.AudioUpdateSchema = {
    duration: ['number', 'min:1'],
    narrator: ['string', 'max:255'],
    quality: ['in:low:medium:high'],
};
exports.TagCreateSchema = {
    name: ['required', 'string', 'min:1', 'max:50', 'tag'],
    description: ['string', 'max:500'],
};
exports.TagUpdateSchema = {
    name: ['string', 'min:1', 'max:50', 'tag'],
    description: ['string', 'max:500'],
};
exports.PromoCodeCreateSchema = {
    code: ['required', 'string', 'pattern:[A-Z0-9]{4,12}', 'max:12'],
    description: ['string', 'max:500'],
    promo_type: ['in:yakaboo_unlimited'],
    is_active: ['boolean'],
};
exports.SavedBookSchema = {
    book_id: ['required', 'number', 'min:1'],
    user_id: ['required', 'number', 'min:1'],
    collection: ['string', 'max:50'],
};
exports.FeedbackCreateSchema = {
    content: ['required', 'string', 'min:10', 'max:5000'],
    type: ['required', 'in:bug:feature:improvement:other'],
    telegram_username: ['string', 'max:255'],
};
exports.FeedbackReplySchema = {
    message: ['required', 'string', 'min:1', 'max:2000'],
};
exports.PaginationSchema = {
    page: ['number', 'min:1'],
    limit: ['number', 'min:1', 'max:100'],
};
exports.BookFilterSchema = {
    genre: ['string', 'max:100'],
    rating: ['number', 'between:1:5'],
    search: ['string', 'max:255'],
    sortBy: ['in:rating:date:title:popularity'],
    limit: ['number', 'min:1', 'max:100'],
    offset: ['number', 'min:0'],
};
function createBookValidation() {
    return new Validator_1.ValidationBuilder()
        .field('title')
        .required()
        .string()
        .min(1)
        .max(255)
        .field('author')
        .required()
        .string()
        .min(1)
        .max(255)
        .field('genre')
        .required()
        .string()
        .min(1)
        .max(100)
        .build();
}
function updateUserValidation() {
    return new Validator_1.ValidationBuilder()
        .field('username')
        .string()
        .min(3)
        .max(32)
        .field('email')
        .email()
        .field('language')
        .in('uk', 'en', 'ru')
        .build();
}
function searchValidation() {
    return new Validator_1.ValidationBuilder()
        .field('query')
        .string()
        .max(255)
        .safe()
        .field('limit')
        .number()
        .between(1, 100)
        .field('offset')
        .number()
        .min(0)
        .build();
}
function ratingValidation() {
    return new Validator_1.ValidationBuilder()
        .field('book_id')
        .required()
        .number()
        .field('rating')
        .required()
        .number()
        .between(1, 5)
        .field('comment')
        .string()
        .max(2000)
        .safe()
        .build();
}
//# sourceMappingURL=ValidationSchemas.js.map