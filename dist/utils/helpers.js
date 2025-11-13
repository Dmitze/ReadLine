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
exports.escapeHtml = exports.formatBookCaption = void 0;
exports.showLoadingAnimation = showLoadingAnimation;
exports.updateLoadingMessage = updateLoadingMessage;
exports.createProgressBar = createProgressBar;
exports.formatStepProgress = formatStepProgress;
const formatBookCaption = async (book, tags) => {
    const escapeHtml = (text) => {
        if (!text)
            return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
            .replace(/�/g, '');
    };
    const safeTitle = escapeHtml(book.title);
    const safeAuthor = escapeHtml(book.author);
    const safeGenre = escapeHtml(book.genre);
    const safeDescription = escapeHtml(book.description);
    let caption = `━━━━━━━━━━━━━━━━━━━━━\n`;
    caption += `📖 <b>${safeTitle}</b>\n`;
    caption += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    caption += `👤 <b>Автор:</b> ${safeAuthor}\n`;
    const genreEmoji = getGenreEmoji(book.genre);
    caption += `${genreEmoji} <b>Жанр:</b> ${safeGenre}\n`;
    if (tags) {
        if (tags.length > 0) {
            const tagNames = tags.map(t => `#${escapeHtml(t.name.replace(/\s+/g, '_'))}`).join(' ');
            caption += `🏷️ <b>Теги:</b> ${tagNames}\n`;
        }
    }
    else if (book.id) {
        try {
            const { getBookTags } = await Promise.resolve().then(() => __importStar(require('../database/tagFunctions')));
            const loadedTags = await getBookTags(book.id);
            if (loadedTags && loadedTags.length > 0) {
                const tagNames = loadedTags.map(t => `#${escapeHtml(t.name.replace(/\s+/g, '_'))}`).join(' ');
                caption += `🏷️ <b>Теги:</b> ${tagNames}\n`;
            }
        }
        catch (error) {
            const { logger } = await Promise.resolve().then(() => __importStar(require('./logger')));
            logger.error('Error loading tags in formatBookCaption', error instanceof Error ? error : new Error(String(error)));
        }
    }
    caption += `\n`;
    if (book.rating && book.rating > 0) {
        const fullStars = Math.floor(book.rating);
        const halfStar = book.rating % 1 >= 0.5 ? '⭐' : '';
        const stars = '⭐'.repeat(fullStars) + halfStar;
        const emptyStars = '☆'.repeat(5 - Math.ceil(book.rating));
        caption += `${stars}${emptyStars} <b>${book.rating.toFixed(1)}/5</b>`;
        if (book.reviews_count && book.reviews_count > 0) {
            caption += ` 💬 ${book.reviews_count} ${getReviewsWord(book.reviews_count)}`;
        }
        caption += `\n\n`;
    }
    caption += `📝 <b>Опис:</b>\n${safeDescription}\n\n`;
    caption += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    const availableFormats = [];
    if (book.pdf_file_id || (book.file_url && book.file_type === 'file')) {
        availableFormats.push('📄 PDF');
    }
    if (book.audio_file_id) {
        let audioText = '🎧 Аудіо';
        if (book.audio_duration) {
            const hours = Math.floor(book.audio_duration / 3600);
            const minutes = Math.floor((book.audio_duration % 3600) / 60);
            if (hours > 0) {
                audioText += ` ⏱️ ${hours}г ${minutes}хв`;
            }
            else {
                audioText += ` ⏱️ ${minutes}хв`;
            }
        }
        availableFormats.push(audioText);
    }
    if (book.online_link || book.external_link || (book.file_url && book.file_type === 'link')) {
        availableFormats.push('🌐 Онлайн');
    }
    if (availableFormats.length > 0) {
        caption += `📦 <b>Доступні формати:</b>\n`;
        availableFormats.forEach(format => {
            caption += `   ${format}\n`;
        });
        caption += `\n`;
    }
    if (book.narrator) {
        const safeNarrator = escapeHtml(book.narrator);
        caption += `🎙️ <b>Читає:</b> ${safeNarrator}\n\n`;
    }
    if (book.downloads_count && book.downloads_count > 0) {
        caption += `📊 <b>Популярність:</b> ${book.downloads_count} ${getDownloadsWord(book.downloads_count)}\n`;
    }
    caption += `\n${book.is_available ? '🟢 <b>Доступна</b>' : '🔴 <b>Недоступна</b>'}`;
    return caption;
};
exports.formatBookCaption = formatBookCaption;
function getGenreEmoji(genre) {
    const genreMap = {
        'Фантастика': '🚀',
        'Детектив': '🔍',
        'Роман': '💕',
        'Історична': '📜',
        'Пригоди': '🗺️',
        'Фентезі': '🐉',
        'Наукова': '🔬',
        'Біографія': '👤',
        'Поезія': '✨',
        'Класика': '📚',
        'Трилер': '😱',
        'Містика': '🔮',
        'Драма': '🎭',
        'Комедія': '😄',
        'Філософія': '🤔'
    };
    return genreMap[genre] || '📖';
}
function getReviewsWord(count) {
    if (count % 10 === 1 && count % 100 !== 11)
        return 'відгук';
    if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20))
        return 'відгуки';
    return 'відгуків';
}
function getDownloadsWord(count) {
    if (count % 10 === 1 && count % 100 !== 11)
        return 'завантаження';
    if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20))
        return 'завантаження';
    return 'завантажень';
}
const escapeHtml = (text) => {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};
exports.escapeHtml = escapeHtml;
async function showLoadingAnimation(ctx, message) {
    const loadingMsg = await ctx.reply(`⏳ ${message}...`);
    return loadingMsg.message_id;
}
async function updateLoadingMessage(ctx, messageId, newText, emoji = '✅') {
    try {
        await ctx.telegram.editMessageText(ctx.chat.id, messageId, undefined, `${emoji} ${newText}`);
    }
    catch (error) {
    }
}
function createProgressBar(current, total) {
    const filled = Math.round((current / total) * 5);
    const empty = 5 - filled;
    return '⬤'.repeat(filled) + '○'.repeat(empty);
}
function formatStepProgress(currentStep, totalSteps, stepName) {
    const progress = createProgressBar(currentStep, totalSteps);
    return `📍 Крок ${currentStep} з ${totalSteps} ${progress}\n\n${stepName}`;
}
//# sourceMappingURL=helpers.js.map