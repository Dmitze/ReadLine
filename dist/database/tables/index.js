"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBookDetailedStats = exports.deleteFeedback = exports.addAdminReply = exports.updateFeedbackStatus = exports.getAllFeedbackMessages = exports.getPendingFeedbackMessages = exports.addFeedbackMessage = exports.removeAdmin = exports.getExtendedAdminStats = exports.getAdminStats = exports.getAllAdmins = exports.isAdmin = exports.addAdmin = exports.getSavedBooksCount = exports.getSavedBooks = exports.isBookSaved = exports.unsaveBook = exports.saveBook = exports.updateBookRating = exports.deleteReview = exports.publishReview = exports.approveReview = exports.getPendingReviews = exports.getBookReviews = exports.addReview = exports.searchBooks = exports.updateBookInfo = exports.incrementDownloads = exports.getNewestBooks = exports.getMostDownloadedBooks = exports.getTopBooks = exports.deleteBook = exports.updateBook = exports.getBooksWithPagination = exports.getBooksByGenreWithPagination = exports.getGenres = exports.getBookById = exports.getAllAvailableBooks = exports.getAllBooks = exports.getBooksByGenre = exports.addBook = exports.initDatabase = exports.db = void 0;
__exportStar(require("./types"), exports);
var db_1 = require("./db");
Object.defineProperty(exports, "db", { enumerable: true, get: function () { return db_1.db; } });
Object.defineProperty(exports, "initDatabase", { enumerable: true, get: function () { return db_1.initDatabase; } });
var books_1 = require("./books");
Object.defineProperty(exports, "addBook", { enumerable: true, get: function () { return books_1.addBook; } });
Object.defineProperty(exports, "getBooksByGenre", { enumerable: true, get: function () { return books_1.getBooksByGenre; } });
Object.defineProperty(exports, "getAllBooks", { enumerable: true, get: function () { return books_1.getAllBooks; } });
Object.defineProperty(exports, "getAllAvailableBooks", { enumerable: true, get: function () { return books_1.getAllAvailableBooks; } });
Object.defineProperty(exports, "getBookById", { enumerable: true, get: function () { return books_1.getBookById; } });
Object.defineProperty(exports, "getGenres", { enumerable: true, get: function () { return books_1.getGenres; } });
Object.defineProperty(exports, "getBooksByGenreWithPagination", { enumerable: true, get: function () { return books_1.getBooksByGenreWithPagination; } });
Object.defineProperty(exports, "getBooksWithPagination", { enumerable: true, get: function () { return books_1.getBooksWithPagination; } });
Object.defineProperty(exports, "updateBook", { enumerable: true, get: function () { return books_1.updateBook; } });
Object.defineProperty(exports, "deleteBook", { enumerable: true, get: function () { return books_1.deleteBook; } });
Object.defineProperty(exports, "getTopBooks", { enumerable: true, get: function () { return books_1.getTopBooks; } });
Object.defineProperty(exports, "getMostDownloadedBooks", { enumerable: true, get: function () { return books_1.getMostDownloadedBooks; } });
Object.defineProperty(exports, "getNewestBooks", { enumerable: true, get: function () { return books_1.getNewestBooks; } });
Object.defineProperty(exports, "incrementDownloads", { enumerable: true, get: function () { return books_1.incrementDownloads; } });
Object.defineProperty(exports, "updateBookInfo", { enumerable: true, get: function () { return books_1.updateBookInfo; } });
Object.defineProperty(exports, "searchBooks", { enumerable: true, get: function () { return books_1.searchBooks; } });
var reviews_1 = require("./reviews");
Object.defineProperty(exports, "addReview", { enumerable: true, get: function () { return reviews_1.addReview; } });
Object.defineProperty(exports, "getBookReviews", { enumerable: true, get: function () { return reviews_1.getBookReviews; } });
Object.defineProperty(exports, "getPendingReviews", { enumerable: true, get: function () { return reviews_1.getPendingReviews; } });
Object.defineProperty(exports, "approveReview", { enumerable: true, get: function () { return reviews_1.approveReview; } });
Object.defineProperty(exports, "publishReview", { enumerable: true, get: function () { return reviews_1.publishReview; } });
Object.defineProperty(exports, "deleteReview", { enumerable: true, get: function () { return reviews_1.deleteReview; } });
Object.defineProperty(exports, "updateBookRating", { enumerable: true, get: function () { return reviews_1.updateBookRating; } });
var savedBooks_1 = require("./savedBooks");
Object.defineProperty(exports, "saveBook", { enumerable: true, get: function () { return savedBooks_1.saveBook; } });
Object.defineProperty(exports, "unsaveBook", { enumerable: true, get: function () { return savedBooks_1.unsaveBook; } });
Object.defineProperty(exports, "isBookSaved", { enumerable: true, get: function () { return savedBooks_1.isBookSaved; } });
Object.defineProperty(exports, "getSavedBooks", { enumerable: true, get: function () { return savedBooks_1.getSavedBooks; } });
Object.defineProperty(exports, "getSavedBooksCount", { enumerable: true, get: function () { return savedBooks_1.getSavedBooksCount; } });
var admins_1 = require("./admins");
Object.defineProperty(exports, "addAdmin", { enumerable: true, get: function () { return admins_1.addAdmin; } });
Object.defineProperty(exports, "isAdmin", { enumerable: true, get: function () { return admins_1.isAdmin; } });
Object.defineProperty(exports, "getAllAdmins", { enumerable: true, get: function () { return admins_1.getAllAdmins; } });
Object.defineProperty(exports, "getAdminStats", { enumerable: true, get: function () { return admins_1.getAdminStats; } });
Object.defineProperty(exports, "getExtendedAdminStats", { enumerable: true, get: function () { return admins_1.getExtendedAdminStats; } });
Object.defineProperty(exports, "removeAdmin", { enumerable: true, get: function () { return admins_1.removeAdmin; } });
var feedback_1 = require("./feedback");
Object.defineProperty(exports, "addFeedbackMessage", { enumerable: true, get: function () { return feedback_1.addFeedbackMessage; } });
Object.defineProperty(exports, "getPendingFeedbackMessages", { enumerable: true, get: function () { return feedback_1.getPendingFeedbackMessages; } });
Object.defineProperty(exports, "getAllFeedbackMessages", { enumerable: true, get: function () { return feedback_1.getAllFeedbackMessages; } });
Object.defineProperty(exports, "updateFeedbackStatus", { enumerable: true, get: function () { return feedback_1.updateFeedbackStatus; } });
Object.defineProperty(exports, "addAdminReply", { enumerable: true, get: function () { return feedback_1.addAdminReply; } });
Object.defineProperty(exports, "deleteFeedback", { enumerable: true, get: function () { return feedback_1.deleteFeedback; } });
var stats_1 = require("./stats");
Object.defineProperty(exports, "getBookDetailedStats", { enumerable: true, get: function () { return stats_1.getBookDetailedStats; } });
//# sourceMappingURL=index.js.map