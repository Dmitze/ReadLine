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
const RateLimiter_1 = require("../middleware/RateLimiter");
const utils_1 = require("./addBook/utils");
const fileUploadStep_1 = require("./addBook/fileUploadStep");
const languageStep_1 = require("./addBook/languageStep");
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
        : '\n📎 Формати: Немає';
    const physicalText = state.is_physically_available
        ? '\n📦 Фізична наявність: ✅ Є в бібліотеці'
        : '\n📦 Фізична наявність: ❌ Тільки електронна';
    const isbnText = state.isbn ? `\n📚 ISBN: ${(0, helpers_1.escapeHtml)(state.isbn)}` : '';
    const languageText = state.language ? `\n🌍 Мова: ${(0, helpers_1.escapeHtml)(state.language)}` : '';
    const previewText = `
${(0, utils_1.getProgress)(11)}

📝 <b>ПОПЕРЕДНІЙ ПЕРЕГЛЯД</b>

📖 <b>${(0, helpers_1.escapeHtml)(state.title || 'Невідома назва')}</b>
👤 ${(0, helpers_1.escapeHtml)(state.author || 'Невідомий автор')}
📚 ${(0, helpers_1.escapeHtml)((state.selectedGenres || []).join(', ') || 'Невідомий жанр')}
📝 ${(0, helpers_1.escapeHtml)(state.description || 'Без опису')}${isbnText}${languageText}${tagsText}${formatsText}${physicalText}

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
    await ctx.reply(`${(0, utils_1.getProgress)(1)}\n📖 Введіть назву книги:\n\n` +
        `${utils_1.examples.title}\n\n` +
        '💡 Або натисніть /cancel для скасування');
    return ctx.wizard.next();
}, async (ctx) => {
    if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply('❌ Будь ласка, надішліть текст (назву книги).');
        return;
    }
    const title = ctx.message.text.trim();
    const { VALIDATION } = await Promise.resolve().then(() => __importStar(require('../constants')));
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
    await ctx.reply(`${(0, utils_1.getProgress)(2)}\n👤 Введіть автора книги:\n\n` +
        `${utils_1.examples.author}\n\n` +
        '💡 Або натисніть /cancel для скасування');
    return ctx.wizard.next();
}, async (ctx) => {
    if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply("❌ Будь ласка, надішліть текст (ім'я автора).");
        return;
    }
    const author = ctx.message.text.trim();
    const { VALIDATION } = await Promise.resolve().then(() => __importStar(require('../constants')));
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
    await ctx.reply(`${(0, utils_1.getProgress)(3)}\n📚 Оберіть жанри книги (1-5 жанрів):`, {
        reply_markup: { inline_keyboard: keyboard },
    });
    return ctx.wizard.next();
}, async (ctx) => {
    const state = ctx.wizard?.state;
    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
        const action = ctx.callbackQuery.data;
        if (action.startsWith('genres_done_')) {
            const expectedUserId = parseInt(action.split('_')[2]);
            const currentUserId = ctx.from?.id;
            if (!currentUserId || expectedUserId !== currentUserId) {
                await ctx.answerCbQuery('❌ Некоректний запит');
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
            await ctx.reply(`${(0, utils_1.getProgress)(4)}\n📝 Введіть короткий опис книги (макс. 1000 символів):\n\n` +
                `${utils_1.examples.description}`);
            return ctx.wizard.next();
        }
        if (action.startsWith('show_all_genres_')) {
            const allGenres = [...utils_1.popularGenres, ...utils_1.otherGenres];
            const keyboard = [];
            for (let i = 0; i < allGenres.length; i += 3) {
                const row = allGenres.slice(i, i + 3).map((genre) => ({
                    text: genre,
                    callback_data: `genre_all_${allGenres.indexOf(genre)}_${ctx.from?.id}`,
                }));
                keyboard.push(row);
            }
            keyboard.push([{ text: '✅ Далі', callback_data: `genres_done_${ctx.from?.id}` }]);
            await ctx.editMessageText(`${(0, utils_1.getProgress)(3)}\n📚 Оберіть жанри з повного списку (1-5 жанрів):`, { reply_markup: { inline_keyboard: keyboard } });
            return;
        }
        if (action.startsWith('genre_popular_') || action.startsWith('genre_all_')) {
            const parts = action.split('_');
            const genreIndex = parseInt(parts[2]);
            const genres = action.startsWith('genre_popular_') ? utils_1.popularGenres : [...utils_1.popularGenres, ...utils_1.otherGenres];
            const selectedGenre = genres[genreIndex];
            if (!state.selectedGenres)
                state.selectedGenres = [];
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
            await ctx.editMessageText(`${(0, utils_1.getProgress)(3)}\n📚 Оберіть жанри книги (1-5 жанрів):${selectedText}`, { reply_markup: ctx.update.callback_query?.message?.reply_markup });
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
    const { VALIDATION } = await Promise.resolve().then(() => __importStar(require('../constants')));
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
    await ctx.reply(`${(0, utils_1.getProgress)(5)}\n🖼️ Завантажте фото обкладинки книги (або натисніть "Пропустити"):`, {
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
    await (0, languageStep_1.showISBNInput)(ctx);
    return ctx.wizard.next();
}, async (ctx) => {
    const state = ctx.wizard?.state;
    const userId = ctx.from?.id;
    if (!userId) {
        await ctx.reply('❌ Помилка: користувач не ідентифікований');
        return ctx.scene?.leave();
    }
    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
        if (ctx.callbackQuery.data.startsWith('skip_isbn_')) {
            state.isbn = undefined;
            await ctx.answerCbQuery('⏭️ ISBN пропущено');
            (0, utils_1.logUserAction)(ctx, 'skipped_isbn');
        }
    }
    else if (ctx.message && 'text' in ctx.message) {
        const text = ctx.message.text.trim().toLowerCase();
        if (text === 'пропустити') {
            state.isbn = undefined;
            (0, utils_1.logUserAction)(ctx, 'skipped_isbn');
        }
        else {
            state.isbn = ctx.message.text.trim();
            await ctx.reply(`✅ ISBN збережено: ${state.isbn}`);
            (0, utils_1.logUserAction)(ctx, 'entered_isbn', { isbn: state.isbn });
        }
    }
    else {
        await ctx.reply('❌ Будь ласка, введіть ISBN або напишіть "Пропустити".');
        return;
    }
    (0, utils_1.autoSaveState)(state);
    await (0, languageStep_1.showLanguageMenu)(ctx, state);
    return ctx.wizard.next();
}, async (ctx) => {
    const state = ctx.wizard?.state;
    const userId = ctx.from?.id;
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
        return;
    }
    const action = ctx.callbackQuery.data;
    const allLanguages = [...languageStep_1.popularLanguages, ...languageStep_1.otherLanguages];
    if (action.startsWith('show_all_languages_')) {
        await (0, languageStep_1.showAllLanguages)(ctx);
        return;
    }
    if (action.startsWith('lang_back_')) {
        await (0, languageStep_1.showLanguageMenu)(ctx, state);
        return;
    }
    if (action.startsWith('lang_popular_') || action.startsWith('lang_all_')) {
        const parts = action.split('_');
        const langIndex = parseInt(parts[2]);
        const languages = action.startsWith('lang_popular_') ? languageStep_1.popularLanguages : allLanguages;
        const selectedLanguage = languages[langIndex];
        state.language = selectedLanguage;
        (0, utils_1.autoSaveState)(state);
        await ctx.answerCbQuery(`✅ ${selectedLanguage} вибрана`);
        await ctx.editMessageText(`✅ Мова: ${selectedLanguage}`);
        (0, utils_1.logUserAction)(ctx, 'selected_language', { language: selectedLanguage });
        if (!userId) {
            await ctx.reply('❌ Помилка: користувач не ідентифікований');
            return ctx.scene?.leave();
        }
        await ctx.reply(`${(0, utils_1.getProgress)(8)}\n\n📦 <b>ЧИ Є ЦЯ КНИГА ФІЗИЧНО В НАЯВНОСТІ?</b>`, {
            parse_mode: 'HTML',
            reply_markup: telegraf_1.Markup.inlineKeyboard([
                [
                    telegraf_1.Markup.button.callback('✅ Є фізично', `book_physical_yes_${userId}`),
                    telegraf_1.Markup.button.callback('❌ Немає', `book_physical_no_${userId}`),
                ]
            ]).reply_markup,
        });
        return ctx.wizard.next();
    }
}, async (ctx) => {
    const state = ctx.wizard?.state;
    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
        const action = ctx.callbackQuery.data;
        if (action.startsWith('book_physical_yes_')) {
            state.is_physically_available = true;
            await ctx.answerCbQuery('✅ Книга буде доступна для замовлення');
            await ctx.editMessageText('✅ Книга позначена як фізично доступна');
            (0, utils_1.logUserAction)(ctx, 'physical_available_yes');
        }
        else if (action.startsWith('book_physical_no_')) {
            state.is_physically_available = false;
            await ctx.answerCbQuery('✅ Тільки електронна версія');
            await ctx.editMessageText('✅ Книга буде доступна тільки в електронному вигляді');
            (0, utils_1.logUserAction)(ctx, 'physical_available_no');
        }
        else {
            return;
        }
        (0, utils_1.autoSaveState)(state);
        await (0, fileUploadStep_1.showFileFormatMenu)(ctx, state);
        return ctx.wizard.next();
    }
}, async (ctx) => {
    const state = ctx.wizard?.state;
    const userId = ctx.from?.id;
    if (!userId) {
        await ctx.reply('❌ Помилка: користувач не ідентифікований');
        return ctx.scene?.leave();
    }
    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
        const action = ctx.callbackQuery.data;
        if (action.startsWith('file_upload_choose_')) {
            const format = action.split('_')[3];
            if (format === 'pdf') {
                await ctx.answerCbQuery('📄 Завантажуємо файл');
                await ctx.editMessageText(`${(0, utils_1.getProgress)(9)}\n\n📎 Надішліть файл книги (PDF, EPUB, FB2):`);
                state.currentUploadFormat = 'file';
            }
            else if (format === 'audio') {
                await ctx.answerCbQuery('🎧 Завантажуємо аудіо');
                await ctx.editMessageText(`${(0, utils_1.getProgress)(9)}\n\n🎧 Надішліть аудіофайл книги (MP3, WAV):`);
                state.currentUploadFormat = 'audio';
            }
            else if (format === 'link') {
                await ctx.answerCbQuery('🔗 Додаємо посилання');
                await ctx.editMessageText(`${(0, utils_1.getProgress)(9)}\n\n🔗 Введіть посилання на книгу:\n\n${utils_1.examples.link}`);
                state.currentUploadFormat = 'link';
            }
            (0, utils_1.autoSaveState)(state);
            return;
        }
        if (action.startsWith('file_upload_done_')) {
            await ctx.answerCbQuery('✅ Переходимо до тегів');
            const tags = await (0, utils_1.getCachedTags)();
            const keyboard = tags.map((tag) => [
                {
                    text: tag.name,
                    callback_data: `tag_${tag.id}_${userId}`,
                },
            ]);
            keyboard.push([{ text: '✅ Далі', callback_data: `tags_done_${userId}` }]);
            await ctx.editMessageText(`${(0, utils_1.getProgress)(10)}\n\n🏷️ <b>ВИБЕРІТЬ ТЕГИ</b>\n\n` +
                `Додайте теги до книги (опціонально):`, {
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: keyboard },
            });
            return ctx.wizard.next();
        }
        return;
    }
    const { allowed } = await fileUploadLimiter.check(ctx);
    if (!allowed) {
        await ctx.reply('❌ Занадто багато завантажень. Зачекайте хвилину.');
        return;
    }
    const format = state.currentUploadFormat;
    if (!format) {
        return;
    }
    const success = await (0, fileUploadStep_1.handleFileFormatUpload)(ctx, state, format);
    if (!success) {
        return;
    }
    (0, utils_1.autoSaveState)(state);
    await (0, fileUploadStep_1.showFileFormatMenu)(ctx, state);
}, async (ctx) => {
    const state = ctx.wizard?.state;
    const userId = ctx.from?.id;
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
        return;
    }
    const action = ctx.callbackQuery.data;
    if (action.startsWith('tags_done_')) {
        await ctx.answerCbQuery('✅ Теги обрано');
        await showFinalPreview(ctx, state);
        return ctx.wizard.next();
    }
    if (action.startsWith('tag_')) {
        const parts = action.split('_');
        const tagId = parseInt(parts[1]);
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
        (0, utils_1.autoSaveState)(state);
    }
}, async (_ctx) => {
    return;
});
addBookScene.action(/^confirm_book_(\d+)$/, async (ctx) => {
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
        isbn: state.isbn || null,
        language: state.language || 'Українська',
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
    const validation = (0, validation_1.validateBookData)(bookData);
    if (!validation.isValid) {
        await ctx.reply('❌ Помилка валідації: ' + validation.errors.join(', '));
        cleanupWizardState(ctx);
        return ctx.scene?.leave();
    }
    try {
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
                inline_keyboard: [[
                        { text: '🏠 Назад до адмін-панелі', callback_data: `back_to_admin_${ctx.from?.id}` }
                    ]],
            },
        });
        cleanupWizardState(ctx);
        return ctx.scene.leave();
    }
    catch (error) {
        logger_1.logger.error('Error publishing book', error);
        console.error('Full error details:', error);
        await ctx.reply(`❌ Помилка при публікації книги: ${error instanceof Error ? error.message : String(error)}`);
        cleanupWizardState(ctx);
        return ctx.scene?.leave();
    }
});
addBookScene.action(/^cancel_book_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery('❌ Скасовано');
    await ctx.reply('❌ Додавання книги скасовано', {
        reply_markup: { remove_keyboard: true },
    });
    cleanupWizardState(ctx);
    return ctx.scene.leave();
});
addBookScene.action(/^back_to_admin_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const { isAdmin, getAdminStats, getPendingReviews, getPendingFeedbackMessages } = await Promise.resolve().then(() => __importStar(require('../database/models')));
    const { getAdminMenuKeyboard } = await Promise.resolve().then(() => __importStar(require('../keyboards/adminKeyboards')));
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
    await ctx.deleteMessage().catch(() => { });
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
    }
}
addBookScene.leave((ctx) => {
    cleanupWizardState(ctx);
});
exports.default = addBookScene;
//# sourceMappingURL=addBookScene.js.map