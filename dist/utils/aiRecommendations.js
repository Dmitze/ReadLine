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
exports.getSimilarBookRecommendations = exports.getMoodBasedRecommendations = exports.getContextualRecommendations = exports.getPersonalizedRecommendations = void 0;
const aiHelper_1 = require("./aiHelper");
const models_1 = require("../database/models");
const recommendationFunctions_1 = require("../database/recommendationFunctions");
const logger_1 = require("./logger");
const getPersonalizedRecommendations = async (userId) => {
    try {
        const savedBooks = await (0, models_1.getSavedBooks)(userId);
        const favoriteGenres = await (0, recommendationFunctions_1.getUserFavoriteGenres)(userId, 3);
        let context = '';
        if (favoriteGenres.length > 0) {
            context += `Улюблені жанри користувача: ${favoriteGenres.join(', ')}.\n`;
        }
        if (savedBooks.length > 0) {
            const bookTitles = savedBooks
                .slice(0, 5)
                .map((b) => `"${b.title}" (${b.author})`)
                .join(', ');
            context += `Користувач зберіг такі книги: ${bookTitles}.\n`;
        }
        if (!context) {
            context = 'Користувач ще не має історії читання.';
        }
        const question = 'На основі історії користувача, порекомендуй 3-5 книг українською мовою. ' +
            'Для кожної книги вкажи:\n' +
            '📖 Назву та автора\n' +
            '💡 Чому ця книга підійде\n' +
            '🎯 Жанр\n\n' +
            `Контекст: ${context}`;
        const aiResponse = await (0, aiHelper_1.askAI)(question, userId);
        const recommendations = aiResponse.text;
        logger_1.logger.info('AI recommendations generated', { userId, hasHistory: savedBooks.length > 0 });
        return recommendations;
    }
    catch (error) {
        logger_1.logger.error('Error generating personalized recommendations', error instanceof Error ? error : new Error(String(error)), { userId });
        throw error;
    }
};
exports.getPersonalizedRecommendations = getPersonalizedRecommendations;
const getContextualRecommendations = async () => {
    const { TIME_OF_DAY } = await Promise.resolve().then(() => __importStar(require('../constants')));
    const hour = new Date().getHours();
    let timeContext = '';
    if (hour >= TIME_OF_DAY.MORNING_START && hour < TIME_OF_DAY.AFTERNOON_START) {
        timeContext = 'Зараз ранок. Порекомендуй мотиваційні або легкі книги для початку дня.';
    }
    else if (hour >= TIME_OF_DAY.AFTERNOON_START && hour < TIME_OF_DAY.EVENING_START) {
        timeContext = 'Зараз день. Порекомендуй книги для продуктивного читання або навчання.';
    }
    else if (hour >= TIME_OF_DAY.EVENING_START && hour < TIME_OF_DAY.NIGHT_START) {
        timeContext = 'Зараз вечір. Порекомендуй художню літературу або книги для відпочинку.';
    }
    else {
        timeContext = 'Зараз ніч. Порекомендуй спокійні книги для читання перед сном.';
    }
    const question = `${timeContext}\n` +
        'Дай 3-4 рекомендації українською мовою з назвою, автором та коротким поясненням.';
    try {
        const aiResponse = await (0, aiHelper_1.askAI)(question);
        const recommendations = aiResponse.text;
        logger_1.logger.info('Contextual recommendations generated', { hour });
        return recommendations;
    }
    catch (error) {
        logger_1.logger.error('Error generating contextual recommendations', error instanceof Error ? error : new Error(String(error)));
        throw error;
    }
};
exports.getContextualRecommendations = getContextualRecommendations;
const getMoodBasedRecommendations = async (mood) => {
    const moodMap = {
        щасливий: 'веселі, позитивні книги',
        сумний: 'книги що підіймуть настрій або допоможуть зрозуміти емоції',
        втомлений: 'легкі, невимушені книги',
        енергійний: 'динамічні, захоплюючі книги',
        задумливий: 'філософські, глибокі книги',
        романтичний: 'романтичні історії',
        пригодницький: 'пригодницькі романи',
    };
    const moodDescription = moodMap[mood.toLowerCase()] || 'книги що підходять під цей настрій';
    const question = `Користувач в настрої: ${mood}. ` +
        `Порекомендуй 3-4 ${moodDescription} українською мовою. ` +
        'Для кожної книги вкажи назву, автора та чому вона підійде.';
    try {
        const aiResponse = await (0, aiHelper_1.askAI)(question);
        const recommendations = aiResponse.text;
        logger_1.logger.info('Mood-based recommendations generated', { mood });
        return recommendations;
    }
    catch (error) {
        logger_1.logger.error('Error generating mood-based recommendations', error instanceof Error ? error : new Error(String(error)), { mood });
        throw error;
    }
};
exports.getMoodBasedRecommendations = getMoodBasedRecommendations;
const getSimilarBookRecommendations = async (bookTitle, bookAuthor) => {
    const question = `Користувачу сподобалась книга "${bookTitle}" автора ${bookAuthor}. ` +
        'Порекомендуй 4-5 схожих книг українською мовою. ' +
        'Для кожної вкажи назву, автора та чому вона схожа.';
    try {
        const aiResponse = await (0, aiHelper_1.askAI)(question);
        const recommendations = aiResponse.text;
        logger_1.logger.info('Similar book recommendations generated', { bookTitle, bookAuthor });
        return recommendations;
    }
    catch (error) {
        logger_1.logger.error('Error generating similar book recommendations', error instanceof Error ? error : new Error(String(error)), { bookTitle });
        throw error;
    }
};
exports.getSimilarBookRecommendations = getSimilarBookRecommendations;
//# sourceMappingURL=aiRecommendations.js.map