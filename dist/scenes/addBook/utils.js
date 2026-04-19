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
exports.otherGenres = exports.popularGenres = exports.examples = void 0;
exports.getProgress = getProgress;
exports.logUserAction = logUserAction;
exports.autoSaveState = autoSaveState;
exports.getCachedTags = getCachedTags;
exports.invalidateTagsCache = invalidateTagsCache;
exports.showFormatSelection = showFormatSelection;
exports.proceedToTags = proceedToTags;
exports.showBookPreview = showBookPreview;
exports.handleFileUpload = handleFileUpload;
const logger_1 = require("../../utils/logger");
const MemoryCache_1 = require("../../cache/MemoryCache");
const RateLimiter_1 = require("../../middleware/RateLimiter");
const limits_1 = require("../../constants/limits");
function getProgress(step) {
    const totalSteps = limits_1.LIMITS.ADD_BOOK_STEPS_TOTAL;
    const filled = '█'.repeat(step);
    const empty = '░'.repeat(totalSteps - step);
    return `[${filled}${empty}] ${step}/${totalSteps} кроків`;
}
exports.examples = {
    title: '💡 Приклад: "Кобзар", "Тіні забутих предків"',
    author: '💡 Приклад: "Тарас Шевченко", "Михайло Коцюбинський"',
    description: '💡 Приклад: "Збірка поезій великого українського поета. Включає найвідоміші твори про свободу, любов та боротьбу українського народу."',
    link: '💡 Приклад: https://example.com/book.pdf',
};
exports.popularGenres = [
    'Художня література',
    'Наукова література',
    'Історія',
    'Філософія',
    'Поезія',
    'Детектив',
    'Фантастика',
    'Біографія',
];
exports.otherGenres = [
    'Пригоди',
    'Роман',
    'Драма',
    'Комедія',
    'Трилер',
    'Містика',
    'Фентезі',
    'Класика',
    'Психологія',
    'Економіка',
    'Політика',
    'Мемуари',
    'Есе',
    'Публіцистика',
    'Довідник',
    'Енциклопедія',
];
function logUserAction(ctx, action, data) {
    if (ctx.from?.id) {
        logger_1.logger.userAction(ctx.from.id, action, data);
    }
}
function autoSaveState(state) {
    logger_1.logger.debug('State auto-saved', state);
}
const tagsCache = new MemoryCache_1.MemoryCache(5 * 60 * 1000);
const fileUploadLimiter = new RateLimiter_1.RateLimiter({
    windowMs: 60000,
    maxRequests: 5,
    keyGenerator: (ctx) => `file_upload:${ctx.from?.id || 'unknown'}`,
});
async function getCachedTags() {
    return tagsCache.getOrSet('all_tags', async () => {
        const { getAllTags } = await Promise.resolve().then(() => __importStar(require('../../database/tagFunctions')));
        return await getAllTags();
    });
}
function invalidateTagsCache() {
    tagsCache.delete('all_tags');
    logger_1.logger.debug('Tags cache invalidated');
}
async function showFormatSelection(ctx, _state) {
    const userId = ctx.from?.id;
    if (!userId) {
        await ctx.reply('❌ Помилка: користувач не ідентифікований');
        return;
    }
    await ctx.reply('📎 Оберіть тип книги:', {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '📄 Файл (PDF, EPUB, FB2)', callback_data: `type_file_${userId}` },
                    { text: '🎧 Аудіокнига', callback_data: `type_audio_${userId}` },
                ],
                [
                    { text: '🌐 Онлайн посилання', callback_data: `type_link_${userId}` },
                    { text: '📚 Тільки фізична', callback_data: `type_physical_${userId}` },
                ],
            ],
        },
    });
}
async function proceedToTags(ctx) {
    const tags = await getCachedTags();
    const userId = ctx.from?.id;
    if (!userId) {
        await ctx.reply('❌ Не вдалося ідентифікувати користувача');
        return;
    }
    const keyboard = tags.map((tag) => [
        {
            text: tag.name,
            callback_data: `tag_${tag.id}_${userId}`,
        },
    ]);
    keyboard.push([{ text: '✅ Далі', callback_data: `preview_skip_tags_${userId}` }]);
    await ctx.reply(`${getProgress(8)}\n🏷️ Додайте теги до книги (опціонально):`, {
        reply_markup: { inline_keyboard: keyboard },
    });
}
async function showBookPreview(ctx, state) {
    const { getAllTags } = await Promise.resolve().then(() => __importStar(require('../../database/tagFunctions')));
    const { escapeHtml } = await Promise.resolve().then(() => __importStar(require('../../utils/helpers')));
    const userId = ctx.from?.id;
    if (!userId) {
        await ctx.reply('❌ Помилка: користувач не ідентифікований');
        return;
    }
    try {
        const tags = await getAllTags();
        const selectedTags = state.selectedTags || [];
        const tagNames = tags
            .filter((t) => selectedTags.includes(t.id))
            .map((t) => `#${escapeHtml(t.name)}`)
            .join(' ');
        const tagsText = tagNames ? `\n🏷️ <b>Теги:</b> ${tagNames}` : '';
        const formats = [];
        if (state.bookFile) {
            formats.push('📥 Завантажити');
        }
        if (state.bookAudio) {
            formats.push('🎧 Слухати');
        }
        if (state.bookLink) {
            formats.push('🔗 Читати онлайн');
        }
        const formatsText = formats.length > 0 ? `\n\n📎 <b>Доступно:</b> ${formats.join(' • ')}` : '';
        const physicalStatus = state.is_physically_available
            ? '\n\n📦 <b>ФІЗИЧНА НАЯВНІСТЬ:</b>\n✅ Книга є в бібліотеці Галичини\n📍 Можна замовити для отримання'
            : '\n\n📦 <b>ФІЗИЧНА НАЯВНІСТЬ:</b>\n❌ Тільки електронна версія';
        const safeTitle = escapeHtml(state.title || 'Невідома назва');
        const safeAuthor = escapeHtml(state.author || 'Невідомий автор');
        const safeGenres = state.selectedGenres?.map((g) => escapeHtml(g)).join(', ') || 'Невідомий жанр';
        const safeDescription = escapeHtml(state.description || 'Без опису');
        const preview = `${getProgress(8)}\n\n` +
            '📖 <b>ПОПЕРЕДНІЙ ПЕРЕГЛЯД</b>\n\n' +
            `<b>${safeTitle}</b>\n` +
            `👤 <i>${safeAuthor}</i>\n` +
            `📚 ${safeGenres}\n\n` +
            `📝 ${safeDescription}${tagsText}${formatsText}${physicalStatus}\n\n` +
            '━━━━━━━━━━━━━━━━━━━\n\n' +
            'Все вірно?';
        await ctx.reply(preview, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '✅ Опублікувати', callback_data: `confirm_book_${userId}` },
                        { text: '❌ Скасувати', callback_data: `cancel_book_${userId}` },
                    ],
                    [
                        { text: '✏️ Назва', callback_data: `edit_title_${userId}` },
                        { text: '✏️ Автор', callback_data: `edit_author_${userId}` },
                    ],
                    [{ text: '✏️ Опис', callback_data: `edit_description_${userId}` }],
                ],
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Error showing book preview:', error);
        await ctx.reply('❌ Помилка при показі попереднього перегляду');
    }
}
async function handleFileUpload(ctx, uploadCallback) {
    const { allowed } = await fileUploadLimiter.check(ctx);
    if (!allowed) {
        await ctx.reply('❌ Занадто багато завантажень файлів. Зачекайте хвилину та спробуйте ще раз.');
        logger_1.logger.warn('File upload rate limited', { userId: ctx.from?.id });
        return false;
    }
    try {
        await uploadCallback();
        logger_1.logger.info('File upload successful', { userId: ctx.from?.id });
        return true;
    }
    catch (error) {
        logger_1.logger.error('File upload failed', error, { userId: ctx.from?.id });
        return false;
    }
}
//# sourceMappingURL=utils.js.map