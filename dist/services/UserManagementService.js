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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserManagementService = void 0;
exports.createUserManagementService = createUserManagementService;
const Result_1 = require("../core/Result");
const logger_1 = require("../utils/logger");
const limits_1 = require("../constants/limits");
class UserManagementService {
    constructor(db) {
        this.db = db;
    }
    async getUserProfile(userId) {
        try {
            const { getUserDetailedStats } = await Promise.resolve().then(() => __importStar(require('../database/userFunctions')));
            const stats = await getUserDetailedStats(userId);
            const { getSavedBooks } = await Promise.resolve().then(() => __importStar(require('../database/models')));
            const { getBookTags } = await Promise.resolve().then(() => __importStar(require('../database/tagFunctions')));
            const savedBooks = await getSavedBooks(userId);
            const genresFromBooks = new Set();
            savedBooks.forEach((book) => {
                if (book.genre) {
                    genresFromBooks.add(book.genre);
                }
            });
            const allGenres = [...new Set([...stats.favoriteGenres, ...Array.from(genresFromBooks)])];
            const allUserTags = new Set();
            for (const book of savedBooks) {
                const bookTags = await getBookTags(book.id);
                bookTags.forEach((tag) => allUserTags.add(tag.name));
            }
            const profile = {
                userId,
                firstName: '',
                lastName: '',
                username: '',
                stats,
                favoriteGenres: allGenres,
                userTags: Array.from(allUserTags),
            };
            return (0, Result_1.ok)(profile);
        }
        catch (error) {
            const errMsg = error instanceof Error ? error : new Error(String(error));
            logger_1.logger.error('Failed to get user profile', errMsg, { userId });
            return (0, Result_1.err)(errMsg);
        }
    }
    async getUserStats(userId) {
        try {
            const { getUserDetailedStats } = await Promise.resolve().then(() => __importStar(require('../database/userFunctions')));
            const stats = await getUserDetailedStats(userId);
            return (0, Result_1.ok)(stats);
        }
        catch (error) {
            const errMsg = error instanceof Error ? error : new Error(String(error));
            logger_1.logger.error('Failed to get user stats', errMsg, { userId });
            return (0, Result_1.err)(errMsg);
        }
    }
    async getPersonalCollection(userId, limit = 5) {
        try {
            const { getSmartRecommendations } = await Promise.resolve().then(() => __importStar(require('../database/recommendationFunctions')));
            let collection = await getSmartRecommendations(userId, limit);
            if (collection.length > 0) {
                return (0, Result_1.ok)({
                    books: collection,
                    source: 'smart_recommendations',
                    count: collection.length,
                });
            }
            const { getTopBooks } = await Promise.resolve().then(() => __importStar(require('../database/models')));
            const topBooks = await getTopBooks(Math.min(limit, 3));
            if (topBooks.length > 0) {
                return (0, Result_1.ok)({
                    books: topBooks,
                    source: 'top_books',
                    count: topBooks.length,
                });
            }
            const { getNewestBooks } = await Promise.resolve().then(() => __importStar(require('../database/models')));
            const newBooks = await getNewestBooks(Math.min(limit, 3));
            return (0, Result_1.ok)({
                books: newBooks,
                source: 'new_books',
                count: newBooks.length,
            });
        }
        catch (error) {
            const errMsg = error instanceof Error ? error : new Error(String(error));
            logger_1.logger.error('Failed to get personal collection', errMsg, { userId, limit });
            return (0, Result_1.err)(errMsg);
        }
    }
    async getUserFavoriteGenres(userId) {
        try {
            const { getSavedBooks } = await Promise.resolve().then(() => __importStar(require('../database/models')));
            const savedBooks = await getSavedBooks(userId);
            const genres = new Set();
            savedBooks.forEach((book) => {
                if (book.genre) {
                    genres.add(book.genre);
                }
            });
            return (0, Result_1.ok)(Array.from(genres));
        }
        catch (error) {
            const errMsg = error instanceof Error ? error : new Error(String(error));
            logger_1.logger.error('Failed to get user favorite genres', errMsg, { userId });
            return (0, Result_1.err)(errMsg);
        }
    }
    async getUserInterestTags(userId) {
        try {
            const { getSavedBooks } = await Promise.resolve().then(() => __importStar(require('../database/models')));
            const { getBookTags } = await Promise.resolve().then(() => __importStar(require('../database/tagFunctions')));
            const savedBooks = await getSavedBooks(userId);
            const tags = new Set();
            for (const book of savedBooks) {
                const bookTags = await getBookTags(book.id);
                bookTags.forEach((tag) => tags.add(tag.name));
            }
            return (0, Result_1.ok)(Array.from(tags));
        }
        catch (error) {
            const errMsg = error instanceof Error ? error : new Error(String(error));
            logger_1.logger.error('Failed to get user interest tags', errMsg, { userId });
            return (0, Result_1.err)(errMsg);
        }
    }
    async canUserPerformAction(userId, action) {
        try {
            return (0, Result_1.ok)(true);
        }
        catch (error) {
            const errMsg = error instanceof Error ? error : new Error(String(error));
            logger_1.logger.error('Failed to check user action permission', errMsg, { userId, action });
            return (0, Result_1.err)(errMsg);
        }
    }
    formatProfileText(profile) {
        let profileText = '<b>👤 Ваш профіль</b>\n\n';
        profileText += `🆔 ID: ${profile.userId}\n`;
        profileText += `👤 Ім'я: ${profile.firstName} ${profile.lastName}\n`;
        profileText += `🔖 Username: ${profile.username}\n\n`;
        profileText += '<b>📊 Статистика</b>\n';
        profileText += `💾 Збережених книг: ${profile.stats.savedBooksCount}\n`;
        profileText += `⭐ Залишено відгуків: ${profile.stats.reviewsCount}\n`;
        const hours = Math.floor(profile.stats.totalListeningTime / 3600);
        const minutes = Math.floor((profile.stats.totalListeningTime % 3600) / 60);
        profileText += `🎧 Прослухано: ${hours}г ${minutes}хв\n`;
        if (profile.favoriteGenres.length > 0) {
            profileText += '\n<b>📚 Улюблені жанри:</b>\n';
            profile.favoriteGenres.slice(0, 5).forEach((genre, i) => {
                profileText += `${i + 1}. ${genre}\n`;
            });
        }
        else {
            profileText += '\n<i>📚 Улюблені жанри ще не встановлені</i>\n';
        }
        if (profile.userTags.length > 0) {
            profileText += '\n<b>🏷️ Ваші інтереси (теги):</b>\n';
            const tagsArray = profile.userTags.slice(0, limits_1.LIMITS.TAGS_LIMIT);
            profileText += tagsArray.map((tag) => `#${tag}`).join(' ') + '\n';
        }
        profileText += '\n<i>💡 Продовжуйте читати та залишати відгуки!</i>';
        return profileText;
    }
    formatDetailedStatsText(stats) {
        const hours = Math.floor(stats.totalListeningTime / 3600);
        const minutes = Math.floor((stats.totalListeningTime % 3600) / 60);
        let statsText = '📊 <b>Ваша детальна статистика</b>\n\n';
        statsText += `💾 Збережено книг: ${stats.savedBooksCount}\n`;
        statsText += `⭐ Залишено відгуків: ${stats.reviewsCount}\n`;
        statsText += `🎧 Прослухано: ${hours}г ${minutes}хв\n\n`;
        if (stats.favoriteGenres.length > 0) {
            statsText += '📚 *Улюблені жанри:*\n';
            stats.favoriteGenres.forEach((genre, index) => {
                statsText += `${index + 1}. ${genre}\n`;
            });
            statsText += '\n';
        }
        else {
            statsText += '📚 *Улюблені жанри:* не встановлені\n\n';
        }
        statsText += '💡 Продовжуйте читати та слухати!';
        return statsText;
    }
}
exports.UserManagementService = UserManagementService;
function createUserManagementService(db) {
    return new UserManagementService(db);
}
//# sourceMappingURL=UserManagementService.js.map