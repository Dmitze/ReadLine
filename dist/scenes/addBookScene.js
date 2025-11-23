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
const telegraf_1 = require("telegraf");
const models_1 = require("../database/models");
const helpers_1 = require("../utils/helpers");
const logger_1 = require("../utils/logger");
const validation_1 = require("../utils/validation");
const fileValidation_1 = require("../utils/fileValidation");
const RateLimiter_1 = require("../middleware/RateLimiter");
const utils_1 = require("./addBook/utils");
function isMessageWithDocument(ctx) {
    return ctx.message && 'document' in ctx.message && ctx.message.document !== undefined;
}
function isMessageWithAudio(ctx) {
    return ctx.message && 'audio' in ctx.message && ctx.message.audio !== undefined;
}
function isMessageWithVoice(ctx) {
    return ctx.message && 'voice' in ctx.message && ctx.message.voice !== undefined;
}
function isMessageWithText(ctx) {
    return ctx.message && 'text' in ctx.message && typeof ctx.message.text === 'string';
}
async function lazyLoadModule(modulePath) {
    const module = await Promise.resolve(`${modulePath}`).then(s => __importStar(require(s)));
    return module;
}
const fileUploadLimiter = new RateLimiter_1.RateLimiter({ maxRequests: 5, windowMs: 60000 });
async function showFinalPreview(ctx, state) {
    const { getAllTags } = await Promise.resolve().then(() => __importStar(require('../database/tagFunctions')));
    let tagsText = '';
    if (state.selectedTags && state.selectedTags.length > 0) {
        const allTags = await getAllTags();
        const selectedTagNames = state.selectedTags
            .map(tagId => allTags.find(t => t.id === tagId)?.name)
            .filter((name) => name !== undefined)
            .map(name => (0, helpers_1.escapeHtml)(name))
            .join(', ');
        tagsText = `\n🏷️ Теги: ${selectedTagNames}`;
    }
    const formats = [];
    if (state.bookFile)
        formats.push('📄 Файл');
    if (state.bookAudio)
        formats.push('🎧 Аудіо');
    if (state.bookLink)
        formats.push('🔗 Посилання');
    const formatsText = formats.length > 0
        ? '\n📎 Формати: ' + formats.join(', ')
        : '';
    const physicalText = state.is_physically_available
        ? '\n📦 Фізична наявність: ✅ Є в бібліотеці'
        : '\n📦 Фізична наявність: ❌ Тільки електронна';
    const previewText = `
📝 <b>ПОПЕРЕДНІЙ ПЕРЕГЛЯД</b>

📖 <b>${(0, helpers_1.escapeHtml)(state.title || 'Невідома назва')}</b>
👤 ${(0, helpers_1.escapeHtml)(state.author || 'Невідомий автор')}
📚 ${(0, helpers_1.escapeHtml)(state.genre || 'Невідомий жанр')}
📝 ${(0, helpers_1.escapeHtml)(state.description || 'Без опису')}${tagsText}${formatsText}${physicalText}

━━━━━━━━━━━━━━━━━━━

Все вірно? Опублікувати книгу?
  `.trim();
    const userId = ctx.from?.id;
    if (!userId) {
        await ctx.reply('❌ Помилка: користувач не ідентифікований');
        return ctx.scene?.leave();
    }
    if (state.photoFileId && state.photoFileId !== 'default_book_cover') {
        await ctx.replyWithPhoto(state.photoFileId, {
            caption: previewText,
            parse_mode: 'HTML',
            reply_markup: telegraf_1.Markup.inlineKeyboard([
                [telegraf_1.Markup.button.callback('✅ Підтвердити і опублікувати', `confirm_book_${userId}`)],
                [telegraf_1.Markup.button.callback('❌ Скасувати', `cancel_book_${userId}`)]
            ]).reply_markup
        });
    }
    else {
        await ctx.reply(previewText, {
            parse_mode: 'HTML',
            reply_markup: telegraf_1.Markup.inlineKeyboard([
                [telegraf_1.Markup.button.callback('✅ Підтвердити і опублікувати', `confirm_book_${userId}`)],
                [telegraf_1.Markup.button.callback('❌ Скасувати', `cancel_book_${userId}`)]
            ]).reply_markup
        });
    }
}
const addBookScene = new telegraf_1.Scenes.WizardScene('ADD_BOOK_SCENE', async (ctx) => {
    (0, utils_1.logUserAction)(ctx, 'start_add_book');
    await ctx.reply(`${(0, utils_1.getProgress)(0)}\n📖 Введіть назву книги:\n\n` +
        `${utils_1.examples.title}\n\n` +
        '💡 Або натисніть /cancel для скасування');
    return ctx.wizard.next();
}, async (ctx) => {
    if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply('❌ Будь ласка, надішліть текст (назву книги).');
        return;
    }
    const title = ctx.message.text.trim();
    const { VALIDATION } = await lazyLoadModule('../constants');
    if (title.length < VALIDATION.TITLE_MIN) {
        await ctx.reply(`❌ Назва занадто коротка. Мінімум ${VALIDATION.TITLE_MIN} символи.`);
        return;
    }
    if (title.length > VALIDATION.TITLE_MAX) {
        await ctx.reply(`❌ Назва занадто довга. Максимум ${VALIDATION.TITLE_MAX} символів.`);
        return;
    }
    const state = ctx.wizard?.state;
    state.title = title;
    (0, utils_1.autoSaveState)(state);
    (0, utils_1.logUserAction)(ctx, 'entered_title', { title });
    await ctx.reply(`${(0, utils_1.getProgress)(1)}\n👤 Введіть автора книги:\n\n` +
        `${utils_1.examples.author}\n\n` +
        '💡 Або натисніть /cancel для скасування');
    return ctx.wizard.next();
}, async (ctx) => {
    if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply("❌ Будь ласка, надішліть текст (ім'я автора).");
        return;
    }
    const author = ctx.message.text.trim();
    const { VALIDATION } = await lazyLoadModule('../constants');
    if (author.length < VALIDATION.AUTHOR_MIN) {
        await ctx.reply(`❌ Ім\'я автора занадто коротке. Мінімум ${VALIDATION.AUTHOR_MIN} символи.`);
        return;
    }
    const state = ctx.wizard?.state;
    state.author = author;
    (0, utils_1.autoSaveState)(state);
    (0, utils_1.logUserAction)(ctx, 'entered_author', { author });
    const userId = ctx.from?.id;
    if (!userId) {
        await ctx.reply('❌ Помилка: користувач не ідентифікований');
        return ctx.scene?.leave();
    }
    const keyboard = [];
    for (let i = 0; i < utils_1.popularGenres.length; i += 4) {
        const row = utils_1.popularGenres.slice(i, i + 4).map((genre) => ({
            text: genre,
            callback_data: `genre_popular_${utils_1.popularGenres.indexOf(genre)}_${userId}`,
        }));
        keyboard.push(row);
    }
    keyboard.push([{ text: '📚 Всі жанри', callback_data: `show_all_genres_${userId}` }]);
    if (!state.selectedGenres) {
        state.selectedGenres = [];
    }
    await ctx.reply(`${(0, utils_1.getProgress)(2)}\n📚 Оберіть жанри книги (1-5 жанрів):`, {
        reply_markup: { inline_keyboard: keyboard },
    });
    return ctx.wizard.next();
}, async (ctx) => {
    const state = ctx.wizard?.state;
    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
        const action = ctx.callbackQuery.data;
        if (action.startsWith('show_all_genres_')) {
            const expectedUserId = parseInt(action.split('_')[3]);
            const currentUserId = ctx.from?.id;
            if (!currentUserId || expectedUserId !== currentUserId) {
                await ctx.answerCbQuery('❌ Некоректний запит');
                logger_1.logger.warn('CSRF attempt blocked in show_all_genres', {
                    expectedUserId,
                    currentUserId
                });
                return;
            }
            const allGenres = [...utils_1.popularGenres, ...utils_1.otherGenres];
            const keyboard = [];
            for (let i = 0; i < allGenres.length; i += 3) {
                const row = allGenres.slice(i, i + 3).map((genre) => ({
                    text: genre,
                    callback_data: `genre_all_${allGenres.indexOf(genre)}_${currentUserId}`,
                }));
                keyboard.push(row);
            }
            keyboard.push([{ text: '✅ Далі', callback_data: `genres_done_${currentUserId}` }]);
            await ctx.editMessageText(`${(0, utils_1.getProgress)(2)}\n📚 Оберіть жанри з повного списку (1-5 жанрів):`, { reply_markup: { inline_keyboard: keyboard } });
            return;
        }
        if (action.startsWith('genres_done_')) {
            const expectedUserId = parseInt(action.split('_')[2]);
            const currentUserId = ctx.from?.id;
            if (!currentUserId || expectedUserId !== currentUserId) {
                await ctx.answerCbQuery('❌ Некоректний запит');
                logger_1.logger.warn('CSRF attempt blocked in genres_done', {
                    expectedUserId,
                    currentUserId
                });
                return;
            }
            if (!state.selectedGenres || state.selectedGenres.length === 0) {
                await ctx.answerCbQuery('❌ Оберіть хоча б один жанр');
                return;
            }
            state.genre = state.selectedGenres.join(', ');
            await ctx.answerCbQuery('✅ Жанри обрано');
            await ctx.editMessageText(`📚 Жанри обрано: ${state.genre}`);
            (0, utils_1.autoSaveState)(state);
            (0, utils_1.logUserAction)(ctx, 'selected_genres', { genres: state.selectedGenres });
            await ctx.reply(`${(0, utils_1.getProgress)(3)}\n📝 Введіть короткий опис книги (макс. 1000 символів):\n\n` +
                `${utils_1.examples.description}`);
            return ctx.wizard.next();
        }
        if (action.startsWith('genre_popular_') || action.startsWith('genre_all_')) {
            const parts = action.split('_');
            const genreIndex = parseInt(parts[2]);
            const expectedUserId = parseInt(parts[3]);
            const currentUserId = ctx.from?.id;
            if (!currentUserId || expectedUserId !== currentUserId) {
                await ctx.answerCbQuery('❌ Некоректний запит');
                logger_1.logger.warn('CSRF attempt blocked in genre selection', {
                    expectedUserId,
                    currentUserId,
                    action
                });
                return;
            }
            const genres = action.startsWith('genre_popular_')
                ? utils_1.popularGenres
                : [...utils_1.popularGenres, ...utils_1.otherGenres];
            const selectedGenre = genres[genreIndex];
            if (!state.selectedGenres) {
                state.selectedGenres = [];
            }
            const index = state.selectedGenres.indexOf(selectedGenre);
            if (index > -1) {
                state.selectedGenres.splice(index, 1);
                await ctx.answerCbQuery(`❌ ${selectedGenre} видалено`);
            }
            else {
                if (state.selectedGenres.length >= 5) {
                    await ctx.answerCbQuery('❌ Максимум 5 жанрів');
                    return;
                }
                state.selectedGenres.push(selectedGenre);
                await ctx.answerCbQuery(`✅ ${selectedGenre} додано (${state.selectedGenres.length}/5)`);
            }
            const selectedText = state.selectedGenres.length > 0
                ? `\n\n✅ Вибрано: ${state.selectedGenres.join(', ')}`
                : '';
            await ctx.editMessageText(`${(0, utils_1.getProgress)(2)}\n📚 Оберіть жанри книги (1-5 жанрів):${selectedText}`, { reply_markup: ctx.update.callback_query?.message?.reply_markup });
            return;
        }
    }
    return;
}, async (ctx) => {
    if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply('❌ Будь ласка, надішліть текст (опис книги).');
        return;
    }
    const description = ctx.message.text.trim();
    const { VALIDATION } = await lazyLoadModule('../constants');
    if (description.length < VALIDATION.DESCRIPTION_MIN) {
        await ctx.reply(`❌ Опис занадто короткий. Мінімум ${VALIDATION.DESCRIPTION_MIN} символів.`);
        return;
    }
    if (description.length > VALIDATION.DESCRIPTION_MAX) {
        await ctx.reply(`❌ Опис занадто довгий. Максимум ${VALIDATION.DESCRIPTION_MAX} символів. Спробуйте ще раз:`);
        return;
    }
    const state = ctx.wizard?.state;
    state.description = description;
    (0, utils_1.autoSaveState)(state);
    (0, utils_1.logUserAction)(ctx, 'entered_description', { descriptionLength: description.length });
    const userId = ctx.from?.id;
    if (!userId) {
        await ctx.reply('❌ Помилка: користувач не ідентифікований');
        return ctx.scene?.leave();
    }
    await ctx.reply(`${(0, utils_1.getProgress)(4)}\n🖼️ Завантажте фото обкладинки книги (або натисніть "Пропустити"):`, {
        reply_markup: telegraf_1.Markup.inlineKeyboard([
            [{ text: '⏭️ Пропустити', callback_data: `skip_photo_${userId}` }],
        ]).reply_markup,
    });
    return ctx.wizard.next();
}, async (ctx) => {
    const state = ctx.wizard?.state;
    if (ctx.callbackQuery &&
        'data' in ctx.callbackQuery &&
        ctx.callbackQuery.data.startsWith('skip_photo_')) {
        const expectedUserId = parseInt(ctx.callbackQuery.data.split('_')[2]);
        const currentUserId = ctx.from?.id;
        if (!currentUserId || expectedUserId !== currentUserId) {
            await ctx.answerCbQuery('❌ Некоректний запит');
            logger_1.logger.warn('CSRF attempt blocked in skip_photo', {
                expectedUserId,
                currentUserId
            });
            return;
        }
        state.photoFileId = 'default_book_cover';
        await ctx.answerCbQuery('Пропущено');
        await ctx.editMessageText('🖼️ Фото пропущено, буде використана стандартна обкладинка');
        (0, utils_1.logUserAction)(ctx, 'skipped_photo');
    }
    else if (ctx.message &&
        'photo' in ctx.message &&
        ctx.message.photo &&
        ctx.message.photo.length > 0) {
        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        state.photoFileId = photo.file_id;
        await ctx.reply('✅ Фото завантажено');
        (0, utils_1.logUserAction)(ctx, 'uploaded_photo');
    }
    else {
        await ctx.reply('❌ Будь ласка, завантажте фото або натисніть "Пропустити".');
        return;
    }
    (0, utils_1.autoSaveState)(state);
    const userId = ctx.from?.id;
    if (!userId) {
        await ctx.reply('❌ Помилка: користувач не ідентифікований');
        return ctx.scene?.leave();
    }
    await ctx.reply(`${(0, utils_1.getProgress)(5)}\n📎 Оберіть тип книги:`, {
        reply_markup: {
            inline_keyboard: [
                [{ text: '📄 Файл', callback_data: `type_file_${userId}` }],
                [{ text: '🎧 Аудіокнига', callback_data: `type_audio_${userId}` }],
                [{ text: '🔗 Посилання', callback_data: `type_link_${userId}` }],
                [{ text: '📚 Тільки фізична', callback_data: `type_physical_${userId}` }],
            ],
        },
    });
    return ctx.wizard.next();
}, async (ctx) => {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
        await ctx.reply('❌ Будь ласка, оберіть тип книги, використовуючи кнопки.');
        return;
    }
    const callbackData = ctx.callbackQuery.data;
    const parts = callbackData.split('_');
    const type = parts[0] + '_' + parts[1];
    const expectedUserId = parseInt(parts[2]);
    const currentUserId = ctx.from?.id;
    if (!currentUserId || expectedUserId !== currentUserId) {
        await ctx.answerCbQuery('❌ Некоректний запит');
        logger_1.logger.warn('CSRF attempt blocked in type selection', {
            expectedUserId,
            currentUserId,
            callbackData
        });
        return;
    }
    if (type === 'cancel_add') {
        await ctx.answerCbQuery('❌ Скасовано');
        await ctx.reply('❌ Додавання книги скасовано');
        return ctx.scene?.leave();
    }
    if (!type.startsWith('type_')) {
        await ctx.answerCbQuery('❌ Невірний вибір');
        await ctx.reply('❌ Будь ласка, оберіть тип книги, використовуючи кнопки.');
        return;
    }
    const state = ctx.wizard?.state;
    state.bookType = type;
    let messageText = '';
    if (type === 'type_file') {
        await ctx.answerCbQuery('📄 Файл обрано');
        messageText = '📎 Надішліть файл книги:';
    }
    else if (type === 'type_audio') {
        await ctx.answerCbQuery('🎧 Аудіокнига обрана');
        messageText = '🎧 Надішліть аудіофайл книги:';
    }
    else if (type === 'type_link') {
        await ctx.answerCbQuery('🔗 Посилання обрано');
        messageText = `🔗 Введіть посилання на книгу:\n\n${utils_1.examples.link}`;
    }
    else if (type === 'type_physical') {
        await ctx.answerCbQuery('📚 Тільки фізична обрано');
        state.addingAdditionalFormat = false;
        try {
            await ctx.editMessageText('📚 Обрано: тільки фізична книга (без електронних форматів)');
        }
        catch {
            await ctx.reply('📚 Обрано: тільки фізична книга (без електронних форматів)');
        }
        (0, utils_1.logUserAction)(ctx, 'selected_book_type', { type });
        await (0, utils_1.proceedToTags)(ctx);
        return ctx.wizard.selectStep(8);
    }
    (0, utils_1.logUserAction)(ctx, 'selected_book_type', { type });
    try {
        await ctx.editMessageText(messageText);
    }
    catch {
        await ctx.reply(messageText);
    }
    return ctx.wizard.next();
}, async (ctx) => {
    const state = ctx.wizard?.state;
    if (ctx.callbackQuery) {
        return;
    }
    if (ctx.message && 'text' in ctx.message && ctx.message.text === '❌ Скасувати') {
        await ctx.reply('❌ Додавання книги скасовано');
        return ctx.scene?.leave();
    }
    const userId = ctx.from?.id;
    if (userId) {
        const { allowed } = await fileUploadLimiter.check(ctx);
        if (!allowed) {
            await ctx.reply('❌ Занадто багато завантажень файлів. Спробуйте через хвилину.', {
                reply_markup: { remove_keyboard: true },
            });
            return;
        }
    }
    let uploadSuccess = false;
    if (state.bookType === 'type_file') {
        if (isMessageWithDocument(ctx)) {
            const document = ctx.message.document;
            const validation = (0, fileValidation_1.validateDocument)(document.file_size, document.mime_type, document.file_name);
            if (!validation.isValid) {
                await ctx.reply(`❌ ${validation.error}`);
                return;
            }
            if (document.file_size && document.file_size > fileValidation_1.MAX_FILE_SIZES.DOCUMENT) {
                await ctx.reply(`❌ Файл занадто великий (${(document.file_size / 1024 / 1024).toFixed(2)} MB). ` +
                    `Максимум ${(fileValidation_1.MAX_FILE_SIZES.DOCUMENT / 1024 / 1024).toFixed(0)} MB.`);
                return;
            }
            uploadSuccess = await (0, utils_1.handleFileUpload)(ctx, async () => {
                state.bookFile = document.file_id;
                state.bookFileName = document.file_name || 'unknown';
                await ctx.reply(`✅ Файл завантажено: ${state.bookFileName}`);
                (0, utils_1.logUserAction)(ctx, 'uploaded_file', { fileName: state.bookFileName });
            });
        }
        if (!uploadSuccess) {
            await ctx.reply('❌ Будь ласка, надішліть файл.');
            return;
        }
    }
    else if (state.bookType === 'type_audio') {
        const message = ctx.message;
        if (message && 'audio' in message && message.audio) {
            const audio = message.audio;
            uploadSuccess = await (0, utils_1.handleFileUpload)(ctx, async () => {
                state.bookAudio = audio.file_id;
                state.bookAudioName = audio.file_name || 'audiobook';
                await ctx.reply(`✅ Аудіофайл завантажено: ${state.bookAudioName}`);
                (0, utils_1.logUserAction)(ctx, 'uploaded_audio', { fileName: state.bookAudioName });
            });
        }
        else if (message && 'voice' in message && message.voice) {
            const voice = message.voice;
            uploadSuccess = await (0, utils_1.handleFileUpload)(ctx, async () => {
                state.bookAudio = voice.file_id;
                state.bookAudioName = 'voice_message';
                await ctx.reply('✅ Голосове повідомлення завантажено');
                (0, utils_1.logUserAction)(ctx, 'uploaded_voice');
            });
        }
        else {
            await ctx.reply('❌ Будь ласка, надішліть аудіофайл.');
            return;
        }
    }
    else if (state.bookType === 'type_link') {
        if (!ctx.message || !('text' in ctx.message)) {
            await ctx.reply('❌ Будь ласка, надішліть текст (посилання на книгу).');
            return;
        }
        const url = ctx.message.text.trim();
        state.bookLink = url;
        await ctx.reply('✅ Посилання збережено');
        uploadSuccess = true;
        (0, utils_1.logUserAction)(ctx, 'added_link', { link: url });
    }
    if (!uploadSuccess) {
        return;
    }
    (0, utils_1.autoSaveState)(state);
    if (state.addingAdditionalFormat) {
        state.addingAdditionalFormat = false;
        state.bookType = undefined;
        await (0, utils_1.showFormatSelection)(ctx, state);
        return;
    }
    await (0, utils_1.showFormatSelection)(ctx, state);
    return ctx.wizard.next();
}, async (ctx) => {
    const state = ctx.wizard?.state;
    if (state.addingAdditionalFormat && ctx.message && !ctx.callbackQuery) {
        const userId = ctx.from?.id;
        if (userId) {
            const { allowed } = await fileUploadLimiter.check(ctx);
            if (!allowed) {
                await ctx.reply('❌ Занадто багато завантажень файлів. Спробуйте через хвилину.', {
                    reply_markup: { remove_keyboard: true },
                });
                return;
            }
        }
        let uploadSuccess = false;
        if (state.bookType === 'type_file') {
            if (ctx.message && 'document' in ctx.message && ctx.message.document) {
                const document = ctx.message.document;
                uploadSuccess = await (0, utils_1.handleFileUpload)(ctx, async () => {
                    state.bookFile = document.file_id;
                    state.bookFileName = document.file_name || 'unknown';
                    await ctx.reply(`✅ Файл завантажено: ${state.bookFileName}`);
                    (0, utils_1.logUserAction)(ctx, 'uploaded_file', { fileName: state.bookFileName });
                });
            }
            else {
                await ctx.reply('❌ Будь ласка, надішліть файл.');
                return;
            }
        }
        else if (state.bookType === 'type_audio') {
            if (ctx.message && 'audio' in ctx.message && ctx.message.audio) {
                const audio = ctx.message.audio;
                uploadSuccess = await (0, utils_1.handleFileUpload)(ctx, async () => {
                    state.bookAudio = audio.file_id;
                    state.bookAudioName = audio.file_name || 'audiobook';
                    await ctx.reply(`✅ Аудіофайл завантажено: ${state.bookAudioName}`);
                    (0, utils_1.logUserAction)(ctx, 'uploaded_audio', { fileName: state.bookAudioName });
                });
            }
            else if (ctx.message && 'voice' in ctx.message && ctx.message.voice) {
                const voice = ctx.message.voice;
                uploadSuccess = await (0, utils_1.handleFileUpload)(ctx, async () => {
                    state.bookAudio = voice.file_id;
                    state.bookAudioName = 'voice_message';
                    await ctx.reply('✅ Голосове повідомлення завантажено');
                    (0, utils_1.logUserAction)(ctx, 'uploaded_voice');
                });
            }
            if (!uploadSuccess) {
                await ctx.reply('❌ Будь ласка, надішліть аудіофайл.');
                return;
            }
        }
        else if (state.bookType === 'type_link') {
            if (ctx.message && 'text' in ctx.message) {
                const url = ctx.message.text.trim();
                state.bookLink = url;
                await ctx.reply('✅ Посилання збережено');
                uploadSuccess = true;
                (0, utils_1.logUserAction)(ctx, 'added_link', { link: url });
            }
            else {
                await ctx.reply('❌ Будь ласка, надішліть текст (посилання на книгу).');
                return;
            }
        }
        if (uploadSuccess) {
            (0, utils_1.autoSaveState)(state);
            logger_1.logger.info('Additional format uploaded:', {
                hasFile: !!state.bookFile,
                hasAudio: !!state.bookAudio,
                hasLink: !!state.bookLink,
                fileId: state.bookFile?.substring(0, 30) + '...',
                audioId: state.bookAudio?.substring(0, 30) + '...',
                fileIdLength: state.bookFile?.length,
                audioIdLength: state.bookAudio?.length,
            });
            state.addingAdditionalFormat = false;
            state.bookType = undefined;
            await (0, utils_1.showFormatSelection)(ctx, state);
        }
        return;
    }
    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
        const action = ctx.callbackQuery.data;
        if (action.startsWith('preview_skip_tags_')) {
            const expectedUserId = parseInt(action.split('_')[3]);
            const currentUserId = ctx.from?.id;
            if (!currentUserId || expectedUserId !== currentUserId) {
                await ctx.answerCbQuery('❌ Некоректний запит');
                logger_1.logger.warn('CSRF attempt blocked in skip tags', {
                    expectedUserId,
                    currentUserId,
                    action
                });
                return;
            }
            await ctx.answerCbQuery('✅ Переходимо далі');
            const userId = ctx.from?.id;
            if (!userId) {
                await ctx.reply('❌ Помилка: користувач не ідентифікований');
                return ctx.scene?.leave();
            }
            await ctx.reply(`${(0, utils_1.getProgress)(7)}\n\n📦 <b>ЧИ Є ЦЯ КНИГА ФІЗИЧНО В НАЯВНОСТІ?</b>\n\n` +
                'Якщо книга є в бібліотеці Галичини і ви можете передати її користувачу - оберіть "Так".\n\n' +
                '✅ <b>Так</b> - користувачі зможуть залишати замовлення на цю книгу\n' +
                '❌ <b>Ні</b> - тільки електронна версія', {
                parse_mode: 'HTML',
                reply_markup: telegraf_1.Markup.inlineKeyboard([
                    [telegraf_1.Markup.button.callback('✅ Так, є в наявності', `book_physical_yes_${userId}`)],
                    [telegraf_1.Markup.button.callback('❌ Ні, тільки електронна', `book_physical_no_${userId}`)]
                ]).reply_markup
            });
            return ctx.wizard.next();
        }
        if (action.startsWith('preview_tag_') || action.startsWith('tag_')) {
            const parts = action.split('_');
            let tagId;
            let expectedUserId;
            if (action.startsWith('preview_tag_')) {
                tagId = parseInt(parts[2]);
                expectedUserId = parseInt(parts[3]);
            }
            else {
                tagId = parseInt(parts[1]);
                expectedUserId = parseInt(parts[2]);
            }
            const currentUserId = ctx.from?.id;
            if (!currentUserId || expectedUserId !== currentUserId) {
                await ctx.answerCbQuery('❌ Некоректний запит');
                logger_1.logger.warn('CSRF attempt blocked in tag selection', {
                    expectedUserId,
                    currentUserId,
                    action
                });
                return;
            }
            if (!state.selectedTags) {
                state.selectedTags = [];
            }
            const index = state.selectedTags.indexOf(tagId);
            if (index > -1) {
                state.selectedTags.splice(index, 1);
                await ctx.answerCbQuery('❌ Тег видалено');
            }
            else {
                state.selectedTags.push(tagId);
                await ctx.answerCbQuery('✅ Тег додано');
            }
            const allTags = await (0, utils_1.getCachedTags)();
            const selectedTagNames = state.selectedTags
                .map((id) => allTags.find((t) => t.id === id)?.name)
                .filter(Boolean);
            let selectedText = '';
            if (selectedTagNames.length > 0) {
                selectedText = `\n\n✅ *Вибрані теги:* ${selectedTagNames.join(', ')}`;
            }
            await ctx.editMessageText(`${(0, utils_1.getProgress)(6)}\n🏷️ *Додайте теги до книги (опціонально):*\n\n` +
                `Оберіть один або кілька тегів, які підходять до цієї книги.${selectedText}\n\n` +
                'Натисніть "Далі" коли закінчите або щоб пропустити цей крок.', {
                parse_mode: 'HTML',
                reply_markup: ctx.update.callback_query?.message?.reply_markup,
            });
            return;
        }
        if (action.startsWith('cancel_add_')) {
            const expectedUserId = parseInt(action.split('_')[2]);
            const currentUserId = ctx.from?.id;
            if (!currentUserId || expectedUserId !== currentUserId) {
                await ctx.answerCbQuery('❌ Некоректний запит');
                logger_1.logger.warn('CSRF attempt blocked in cancel_add', {
                    expectedUserId,
                    currentUserId
                });
                return;
            }
            await ctx.answerCbQuery('❌ Скасовано');
            await ctx.reply('❌ Додавання книги скасовано');
            return ctx.scene?.leave();
        }
    }
}, async (ctx) => {
    const state = ctx.wizard?.state;
    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
        const action = ctx.callbackQuery.data;
        if (action.startsWith('book_physical_yes_')) {
            const expectedUserId = parseInt(action.split('_')[3]);
            const currentUserId = ctx.from?.id;
            if (!currentUserId || expectedUserId !== currentUserId) {
                await ctx.answerCbQuery('❌ Некоректний запит');
                logger_1.logger.warn('CSRF attempt blocked in book_physical_yes', {
                    expectedUserId,
                    currentUserId
                });
                return;
            }
            await ctx.answerCbQuery('✅ Книга буде доступна для замовлення');
            state.is_physically_available = true;
            await ctx.editMessageText('✅ Книга позначена як фізично доступна');
        }
        else if (action.startsWith('book_physical_no_')) {
            const expectedUserId = parseInt(action.split('_')[3]);
            const currentUserId = ctx.from?.id;
            if (!currentUserId || expectedUserId !== currentUserId) {
                await ctx.answerCbQuery('❌ Некоректний запит');
                logger_1.logger.warn('CSRF attempt blocked in book_physical_no', {
                    expectedUserId,
                    currentUserId
                });
                return;
            }
            await ctx.answerCbQuery('✅ Тільки електронна версія');
            state.is_physically_available = false;
            await ctx.editMessageText('✅ Книга буде доступна тільки в електронному вигляді');
        }
        else {
            return;
        }
        await showFinalPreview(ctx, state);
        return ctx.wizard.next();
    }
}, async (_ctx) => {
    return;
});
addBookScene.use(async (_ctx, next) => {
    await next();
});
addBookScene.action(/^confirm_book_(\d+)$/, async (ctx) => {
    const expectedUserId = parseInt(ctx.match[1]);
    const currentUserId = ctx.from?.id;
    if (!currentUserId || expectedUserId !== currentUserId) {
        await ctx.answerCbQuery('❌ Некоректний запит');
        logger_1.logger.warn('CSRF attempt blocked in confirm_book', {
            expectedUserId,
            currentUserId
        });
        return;
    }
    const state = ctx.wizard?.state;
    await ctx.answerCbQuery('✅ Книга додається...');
    let file_type = 'physical';
    if (state.bookFile)
        file_type = 'file';
    else if (state.bookAudio)
        file_type = 'audio';
    else if (state.bookLink)
        file_type = 'link';
    const bookData = {
        title: state.title,
        author: state.author,
        genre: state.genre,
        description: state.description,
        photo_file_id: state.photoFileId || 'default_book_cover',
        file_type: file_type,
        is_physically_available: state.is_physically_available ? 1 : 0,
    };
    if (state.bookFile) {
        bookData.file_url = state.bookFile;
        bookData.file_name = state.bookFileName;
    }
    if (state.bookAudio) {
        bookData.audio_file_id = state.bookAudio;
    }
    if (state.bookLink) {
        bookData.online_link = state.bookLink;
    }
    logger_1.logger.info('Saving book with data:', {
        hasFile: !!state.bookFile,
        hasAudio: !!state.bookAudio,
        hasLink: !!state.bookLink,
        fileId: state.bookFile?.substring(0, 20),
        audioId: state.bookAudio?.substring(0, 20),
        link: state.bookLink,
    });
    const validation = (0, validation_1.validateBookData)(bookData);
    if (!validation.isValid) {
        await ctx.reply('❌ Помилка валідації: ' + validation.errors.join(', '));
        cleanupWizardState(ctx);
        return ctx.scene?.leave();
    }
    const bookId = await (0, models_1.addBook)(bookData);
    if (state.selectedTags && state.selectedTags.length > 0) {
        const { db } = await Promise.resolve().then(() => __importStar(require('../database/models')));
        const { TagRepository } = await Promise.resolve().then(() => __importStar(require('../repositories/TagRepository')));
        const tagRepo = new TagRepository(db);
        await tagRepo.addBookTags(bookId, state.selectedTags);
    }
    const finalCaption = await (0, helpers_1.formatBookCaption)({
        ...bookData,
        id: bookId,
        is_available: true,
    });
    if (bookData.photo_file_id && bookData.photo_file_id !== 'default_book_cover') {
        await ctx.replyWithPhoto(bookData.photo_file_id, {
            caption: finalCaption,
            parse_mode: 'HTML',
        });
    }
    else {
        await ctx.reply(finalCaption, { parse_mode: 'HTML' });
    }
    (0, utils_1.logUserAction)(ctx, 'book_published', {
        title: state.title,
        formats: {
            hasFile: !!state.bookFile,
            hasAudio: !!state.bookAudio,
            hasLink: !!state.bookLink,
        },
        tagsCount: state.selectedTags?.length || 0,
    });
    await ctx.reply('✅ Книга успішно опублікована!', {
        reply_markup: {
            remove_keyboard: true,
            inline_keyboard: [[{ text: '🏠 Назад до адмін-панелі', callback_data: `back_to_admin_${currentUserId}` }]],
        },
    });
    cleanupWizardState(ctx);
    return ctx.scene.leave();
});
addBookScene.action(/^cancel_book_(\d+)$/, async (ctx) => {
    const expectedUserId = parseInt(ctx.match[1]);
    const currentUserId = ctx.from?.id;
    if (!currentUserId || expectedUserId !== currentUserId) {
        await ctx.answerCbQuery('❌ Некоректний запит');
        logger_1.logger.warn('CSRF attempt blocked in cancel_book', {
            expectedUserId,
            currentUserId
        });
        return;
    }
    await ctx.answerCbQuery('❌ Скасовано');
    await ctx.reply('❌ Додавання книги скасовано', {
        reply_markup: { remove_keyboard: true },
    });
    cleanupWizardState(ctx);
    return ctx.scene.leave();
});
addBookScene.action(/^add_more_file_(\d+)$/, async (ctx) => {
    const expectedUserId = parseInt(ctx.match[1]);
    const currentUserId = ctx.from?.id;
    if (!currentUserId || expectedUserId !== currentUserId) {
        await ctx.answerCbQuery('❌ Некоректний запит');
        logger_1.logger.warn('CSRF attempt blocked in add_more_file', {
            expectedUserId,
            currentUserId
        });
        return;
    }
    const state = ctx.wizard?.state;
    state.bookType = 'type_file';
    state.addingAdditionalFormat = true;
    await ctx.answerCbQuery('📄 Додаємо файл');
    await ctx.editMessageText('📎 Надішліть файл книги:');
});
addBookScene.action(/^add_more_audio_(\d+)$/, async (ctx) => {
    const expectedUserId = parseInt(ctx.match[1]);
    const currentUserId = ctx.from?.id;
    if (!currentUserId || expectedUserId !== currentUserId) {
        await ctx.answerCbQuery('❌ Некоректний запит');
        logger_1.logger.warn('CSRF attempt blocked in add_more_audio', {
            expectedUserId,
            currentUserId
        });
        return;
    }
    const state = ctx.wizard?.state;
    state.bookType = 'type_audio';
    state.addingAdditionalFormat = true;
    await ctx.answerCbQuery('🎧 Додаємо аудіо');
    await ctx.editMessageText('🎧 Надішліть аудіофайл книги:');
});
addBookScene.action(/^add_more_link_(\d+)$/, async (ctx) => {
    const expectedUserId = parseInt(ctx.match[1]);
    const currentUserId = ctx.from?.id;
    if (!currentUserId || expectedUserId !== currentUserId) {
        await ctx.answerCbQuery('❌ Некоректний запит');
        logger_1.logger.warn('CSRF attempt blocked in add_more_link', {
            expectedUserId,
            currentUserId
        });
        return;
    }
    const state = ctx.wizard?.state;
    state.bookType = 'type_link';
    state.addingAdditionalFormat = true;
    await ctx.answerCbQuery('🔗 Додаємо посилання');
    await ctx.editMessageText(`🔗 Введіть посилання на книгу:\n\n${utils_1.examples.link}`);
});
addBookScene.action(/^skip_more_formats_(\d+)$/, async (ctx) => {
    const expectedUserId = parseInt(ctx.match[1]);
    const currentUserId = ctx.from?.id;
    if (!currentUserId || expectedUserId !== currentUserId) {
        await ctx.answerCbQuery('❌ Некоректний запит');
        logger_1.logger.warn('CSRF attempt blocked in skip_more_formats', {
            expectedUserId,
            currentUserId
        });
        return;
    }
    await ctx.answerCbQuery('✅ Переходимо до тегів');
    await (0, utils_1.proceedToTags)(ctx);
});
addBookScene.action(/^edit_title_(\d+)$/, async (ctx) => {
    const expectedUserId = parseInt(ctx.match[1]);
    const currentUserId = ctx.from?.id;
    if (!currentUserId || expectedUserId !== currentUserId) {
        await ctx.answerCbQuery('❌ Некоректний запит');
        logger_1.logger.warn('CSRF attempt blocked in edit_title', {
            expectedUserId,
            currentUserId
        });
        return;
    }
    await ctx.answerCbQuery('✏️ Редагуємо назву');
    await ctx.reply(`${(0, utils_1.getProgress)(1)}\n📖 Введіть нову назву книги:\n\n${utils_1.examples.title}`);
    return ctx.wizard.selectStep(1);
});
addBookScene.action(/^edit_author_(\d+)$/, async (ctx) => {
    const expectedUserId = parseInt(ctx.match[1]);
    const currentUserId = ctx.from?.id;
    if (!currentUserId || expectedUserId !== currentUserId) {
        await ctx.answerCbQuery('❌ Некоректний запит');
        logger_1.logger.warn('CSRF attempt blocked in edit_author', {
            expectedUserId,
            currentUserId
        });
        return;
    }
    await ctx.answerCbQuery('✏️ Редагуємо автора');
    await ctx.reply(`${(0, utils_1.getProgress)(2)}\n👤 Введіть нового автора книги:\n\n${utils_1.examples.author}`);
    return ctx.wizard.selectStep(2);
});
addBookScene.action(/^edit_description_(\d+)$/, async (ctx) => {
    const expectedUserId = parseInt(ctx.match[1]);
    const currentUserId = ctx.from?.id;
    if (!currentUserId || expectedUserId !== currentUserId) {
        await ctx.answerCbQuery('❌ Некоректний запит');
        logger_1.logger.warn('CSRF attempt blocked in edit_description', {
            expectedUserId,
            currentUserId
        });
        return;
    }
    await ctx.answerCbQuery('✏️ Редагуємо опис');
    await ctx.reply(`${(0, utils_1.getProgress)(3)}\n📝 Введіть новий опис книги:\n\n${utils_1.examples.description}`);
    return ctx.wizard.selectStep(4);
});
addBookScene.action(/^edit_photo_(\d+)$/, async (ctx) => {
    const expectedUserId = parseInt(ctx.match[1]);
    const currentUserId = ctx.from?.id;
    if (!currentUserId || expectedUserId !== currentUserId) {
        await ctx.answerCbQuery('❌ Некоректний запит');
        logger_1.logger.warn('CSRF attempt blocked in edit_photo', {
            expectedUserId,
            currentUserId
        });
        return;
    }
    await ctx.answerCbQuery('✏️ Редагуємо фото');
    await ctx.reply(`${(0, utils_1.getProgress)(4)}\n🖼️ Завантажте нове фото обкладинки:`, {
        reply_markup: telegraf_1.Markup.inlineKeyboard([[{ text: '⏭️ Пропустити', callback_data: `skip_photo_${currentUserId}` }]])
            .reply_markup,
    });
    return ctx.wizard.selectStep(5);
});
addBookScene.action(/^edit_formats_(\d+)$/, async (ctx) => {
    const expectedUserId = parseInt(ctx.match[1]);
    const currentUserId = ctx.from?.id;
    if (!currentUserId || expectedUserId !== currentUserId) {
        await ctx.answerCbQuery('❌ Некоректний запит');
        logger_1.logger.warn('CSRF attempt blocked in edit_formats', {
            expectedUserId,
            currentUserId
        });
        return;
    }
    const state = ctx.wizard?.state;
    await ctx.answerCbQuery('✏️ Редагуємо формати');
    await (0, utils_1.showFormatSelection)(ctx, state);
});
addBookScene.command('exit', async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) {
        await ctx.reply('❌ Помилка: користувач не ідентифікований');
        return;
    }
    await ctx.reply('❌ Ви впевнені, що хочете скасувати додавання книги?', {
        reply_markup: telegraf_1.Markup.inlineKeyboard([
            [
                { text: '✅ Так, скасувати', callback_data: `confirm_cancel_${userId}` },
                { text: '❌ Ні, продовжити', callback_data: `continue_adding_${userId}` },
            ],
        ]).reply_markup,
    });
});
addBookScene.action(/^confirm_cancel_(\d+)$/, async (ctx) => {
    const expectedUserId = parseInt(ctx.match[1]);
    const currentUserId = ctx.from?.id;
    if (!currentUserId || expectedUserId !== currentUserId) {
        await ctx.answerCbQuery('❌ Некоректний запит');
        logger_1.logger.warn('CSRF attempt blocked in confirm_cancel', {
            expectedUserId,
            currentUserId
        });
        return;
    }
    await ctx.answerCbQuery();
    await ctx.reply('❌ Додавання книги скасовано');
    return ctx.scene.leave();
});
addBookScene.action(/^continue_adding_(\d+)$/, async (ctx) => {
    const expectedUserId = parseInt(ctx.match[1]);
    const currentUserId = ctx.from?.id;
    if (!currentUserId || expectedUserId !== currentUserId) {
        await ctx.answerCbQuery('❌ Некоректний запит');
        logger_1.logger.warn('CSRF attempt blocked in continue_adding', {
            expectedUserId,
            currentUserId
        });
        return;
    }
    await ctx.answerCbQuery();
    await ctx.reply('✅ Продовжуємо додавання книги...');
});
addBookScene.action(/^back_to_admin_(\d+)$/, async (ctx) => {
    const expectedUserId = parseInt(ctx.match[1]);
    const currentUserId = ctx.from?.id;
    if (!currentUserId || expectedUserId !== currentUserId) {
        await ctx.answerCbQuery('❌ Некоректний запит');
        logger_1.logger.warn('CSRF attempt blocked in back_to_admin', {
            expectedUserId,
            currentUserId
        });
        return;
    }
    await ctx.answerCbQuery();
    const { isAdmin, getAdminStats, getPendingReviews, getPendingFeedbackMessages } = await lazyLoadModule('../database/models');
    const { getAdminMenuKeyboard } = await lazyLoadModule('../keyboards/adminKeyboards');
    const adminCheck = await isAdmin(ctx.from.id);
    if (!adminCheck) {
        await ctx.reply('❌ У вас немає доступу до адмін-панелі.');
        return ctx.scene.leave();
    }
    const stats = await getAdminStats();
    const pendingReviews = await getPendingReviews();
    const pendingFeedback = await getPendingFeedbackMessages();
    const reviewsAlert = pendingReviews.length > 0
        ? `📝 Відгуків на модерацію: <b>${pendingReviews.length}</b> 🔔`
        : '✅ Всі відгуки оброблені';
    const feedbackAlert = pendingFeedback.length > 0
        ? `📞 Нових повідомлень: <b>${pendingFeedback.length}</b> 🔔`
        : '✅ Всі повідомлення прочитані';
    await ctx.deleteMessage().catch((error) => {
        logger_1.logger.debug('Failed to delete message', {
            error: error instanceof Error ? error.message : String(error),
        });
    });
    await ctx.reply('🛠️ <b>Панель адміністратора</b>\n\n' +
        '📊 <b>Статистика:</b>\n' +
        `📚 Книг в каталозі: ${stats.totalBooks}\n` +
        `${reviewsAlert}\n` +
        `${feedbackAlert}`, {
        parse_mode: 'HTML',
        reply_markup: getAdminMenuKeyboard(pendingReviews.length, pendingFeedback.length),
    });
    await ctx.scene.leave();
});
addBookScene.command('cancel', async (ctx) => {
    await ctx.reply('❌ Додавання книги скасовано', {
        reply_markup: { remove_keyboard: true },
    });
    cleanupWizardState(ctx);
    return ctx.scene.leave();
});
function cleanupWizardState(ctx) {
    const state = ctx.wizard?.state;
    if (state) {
        Object.keys(state).forEach((key) => {
            delete state[key];
        });
        logger_1.logger.debug('Wizard state cleaned up', { userId: ctx.from?.id });
    }
}
addBookScene.leave((ctx) => {
    cleanupWizardState(ctx);
    logger_1.logger.debug('AddBookScene cleanup completed', { userId: ctx.from?.id });
});
addBookScene.use(async (ctx, next) => {
    try {
        await next();
    }
    catch (error) {
        logger_1.logger.error('Error in addBookScene', error instanceof Error ? error : new Error(String(error)), {
            userId: ctx.from?.id,
            scene: 'addBookScene'
        });
        cleanupWizardState(ctx);
    }
});
exports.default = addBookScene;
//# sourceMappingURL=addBookScene.js.map