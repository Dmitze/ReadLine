"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.escapeHtml = exports.formatRequestInfo = exports.formatBookCaption = void 0;
exports.showLoadingAnimation = showLoadingAnimation;
exports.updateLoadingMessage = updateLoadingMessage;
exports.createProgressBar = createProgressBar;
exports.formatStepProgress = formatStepProgress;
const tagFunctions_1 = require("../database/tagFunctions");
const formatBookCaption = async (book) => {
    let caption = `╔═══════════════════════╗\n`;
    caption += `📖 *${book.title}*\n`;
    caption += `╚═══════════════════════╝\n\n`;
    caption += `✍️ *Автор:* ${book.author}\n`;
    const genreEmoji = getGenreEmoji(book.genre);
    caption += `${genreEmoji} *Жанр:* ${book.genre}\n`;
    if (book.id) {
        try {
            const tags = await (0, tagFunctions_1.getBookTags)(book.id);
            if (tags.length > 0) {
                const tagNames = tags.map(t => `#${t.name.replace(/\s+/g, '_')}`).join(' ');
                caption += `🏷️ *Теги:* ${tagNames}\n`;
            }
        }
        catch (error) {
        }
    }
    caption += `\n`;
    if (book.rating && book.rating > 0) {
        const fullStars = Math.floor(book.rating);
        const halfStar = book.rating % 1 >= 0.5 ? '⭐' : '';
        const stars = '⭐'.repeat(fullStars) + halfStar;
        const emptyStars = '☆'.repeat(5 - Math.ceil(book.rating));
        caption += `${stars}${emptyStars} *${book.rating.toFixed(1)}/5*`;
        if (book.reviews_count && book.reviews_count > 0) {
            caption += ` 💬 ${book.reviews_count} ${getReviewsWord(book.reviews_count)}`;
        }
        caption += `\n\n`;
    }
    caption += `📝 *Опис:*\n${book.description}\n\n`;
    caption += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    const availableFormats = [];
    if (book.pdf_file_id || (book.file_type === 'file' && book.file_url)) {
        availableFormats.push('📄 PDF');
    }
    if (book.external_link || (book.file_type === 'link' && book.file_url)) {
        availableFormats.push('🌐 Онлайн');
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
    if (availableFormats.length > 0) {
        caption += `📦 *Доступні формати:*\n`;
        availableFormats.forEach(format => {
            caption += `   ${format}\n`;
        });
        caption += `\n`;
    }
    if (book.narrator) {
        caption += `🎙️ *Читає:* ${book.narrator}\n\n`;
    }
    if (book.downloads_count && book.downloads_count > 0) {
        caption += `📊 *Популярність:* ${book.downloads_count} ${getDownloadsWord(book.downloads_count)}\n`;
    }
    caption += `\n${book.is_available ? '🟢 *Доступна*' : '🔴 *Недоступна*'}`;
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
const formatRequestInfo = (request, book) => {
    let info = `📋 Заявка #${request.id}\n`;
    info += `📖 Книга: ${book.title}\n`;
    info += `👤 ПІБ: ${request.full_name}\n`;
    info += `🎯 Підрозділ: ${request.unit}\n`;
    info += `📞 Телефон: ${request.phone}\n`;
    info += `📅 Дата: ${request.created_at}`;
    return info;
};
exports.formatRequestInfo = formatRequestInfo;
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