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
const tagFunctions_1 = require("../database/tagFunctions");
const helpers_1 = require("../utils/helpers");
const logger_1 = require("../utils/logger");
const validation_1 = require("../utils/validation");
const aiHelper_1 = require("../utils/aiHelper");
const addBookScene = new telegraf_1.Scenes.WizardScene('ADD_BOOK_SCENE', async (ctx) => {
    await ctx.reply('📖 Введіть назву книги:\n\n' +
        '💡 Або натисніть /cancel для скасування', {
        reply_markup: telegraf_1.Markup.keyboard([
            ['❌ Скасувати']
        ]).resize().reply_markup
    });
    return ctx.wizard.next();
}, async (ctx) => {
    if (ctx.message && 'text' in ctx.message && ctx.message.text === '❌ Скасувати') {
        await ctx.reply('❌ Додавання книги скасовано');
        return ctx.scene?.leave();
    }
    if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply('❌ Будь ласка, надішліть текст (назву книги).\n\n' +
            '💡 Або натисніть /cancel для скасування');
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
    (ctx.wizard?.state).title = title;
    await ctx.reply('👤 Введіть автора книги:\n\n' +
        '💡 Або натисніть /cancel для скасування', {
        reply_markup: telegraf_1.Markup.keyboard([
            ['❌ Скасувати']
        ]).resize().reply_markup
    });
    return ctx.wizard.next();
}, async (ctx) => {
    if (ctx.message && 'text' in ctx.message && ctx.message.text === '❌ Скасувати') {
        await ctx.reply('❌ Додавання книги скасовано');
        return ctx.scene?.leave();
    }
    if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply('❌ Будь ласка, надішліть текст (ім\'я автора).\n\n' +
            '💡 Або натисніть /cancel для скасування');
        return;
    }
    const author = ctx.message.text.trim();
    const { VALIDATION } = await Promise.resolve().then(() => __importStar(require('../constants')));
    if (author.length < VALIDATION.AUTHOR_MIN) {
        await ctx.reply(`❌ Ім\'я автора занадто коротке. Мінімум ${VALIDATION.AUTHOR_MIN} символи.`);
        return;
    }
    (ctx.wizard?.state).author = author;
    const genres = [
        'Фантастика', 'Sci-Fi', 'Кіберпанк', 'Фентезі', 'Антиутопія',
        'Детектив', 'Трилер', 'Нуар', 'Шпигунський роман',
        'Пригоди', 'Історичні пригоди', 'Бойовик',
        'Романтика', 'Любовний роман', 'Мелодрама',
        'Жахи', 'Містика', 'Хорор',
        'Дитячі', 'Казки', 'Young Adult',
        'Біографія', 'Мемуари', 'Есеї', 'Документальні',
        'Військова', 'Історична', 'Технічна', 'Психологія',
        'Художня', 'Поезія', 'Драма', 'Сатира'
    ];
    const keyboard = [];
    for (let i = 0; i < genres.length; i += 2) {
        const row = [
            { text: genres[i], callback_data: `genre_${i}` }
        ];
        if (i + 1 < genres.length) {
            row.push({ text: genres[i + 1], callback_data: `genre_${i + 1}` });
        }
        keyboard.push(row);
    }
    await ctx.reply('📚 Оберіть жанр книги:', {
        reply_markup: { inline_keyboard: keyboard }
    });
    return ctx.wizard.next();
}, async (ctx) => {
    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
        const genreIndex = parseInt(ctx.callbackQuery.data.split('_')[1]);
        const genres = [
            'Фантастика', 'Sci-Fi', 'Кіберпанк', 'Фентезі', 'Антиутопія',
            'Детектив', 'Трилер', 'Нуар', 'Шпигунський роман',
            'Пригоди', 'Історичні пригоди', 'Бойовик',
            'Романтика', 'Любовний роман', 'Мелодрама',
            'Жахи', 'Містика', 'Хорор',
            'Дитячі', 'Казки', 'Young Adult',
            'Біографія', 'Мемуари', 'Есеї', 'Документальні',
            'Військова', 'Історична', 'Технічна', 'Психологія',
            'Художня', 'Поезія', 'Драма', 'Сатира'
        ];
        const state = ctx.wizard?.state;
        state.genre = genres[genreIndex];
        await ctx.editMessageText('📚 Жанр обрано: ' + state.genre);
    }
    await ctx.reply('📝 Введіть короткий опис книги (макс. 1000 символів):');
    return ctx.wizard.next();
}, async (ctx) => {
    if (ctx.message && 'text' in ctx.message && ctx.message.text === '❌ Скасувати') {
        await ctx.reply('❌ Додавання книги скасовано');
        return ctx.scene?.leave();
    }
    if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply('❌ Будь ласка, надішліть текст (опис книги).\n\n' +
            '💡 Або натисніть /cancel для скасування');
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
    if ((0, aiHelper_1.isAIEnabled)() && state.title && state.author && state.genre) {
        await ctx.reply('🤖 AI перевіряє опис та генерує теги...');
        try {
            const suggestedTags = await (0, aiHelper_1.generateTagsFromDescription)(state.title, description, state.genre);
            if (suggestedTags.length > 0) {
                state.aiSuggestedTags = suggestedTags;
                await ctx.reply(`🏷️ *AI запропонував теги:*\n\n` +
                    suggestedTags.map(tag => `• ${tag}`).join('\n') +
                    `\n\nВи зможете додати їх після збереження книги.`, { parse_mode: 'HTML' });
            }
        }
        catch (error) {
            logger_1.logger.error('AI tag generation error', error instanceof Error ? error : new Error(String(error)));
        }
    }
    await ctx.reply('🖼️ Завантажте фото обкладинки книги (або натисніть "Пропустити"):', {
        reply_markup: telegraf_1.Markup.inlineKeyboard([
            [{ text: '⏭️ Пропустити', callback_data: 'skip_photo' }]
        ]).reply_markup
    });
    return ctx.wizard.next();
}, async (ctx) => {
    const state = ctx.wizard?.state;
    if (ctx.callbackQuery && 'data' in ctx.callbackQuery && ctx.callbackQuery.data === 'skip_photo') {
        state.photoFileId = 'default_book_cover';
        await ctx.answerCbQuery('Пропущено');
        await ctx.editMessageText('🖼️ Фото пропущено, буде використана стандартна обкладинка');
    }
    else if (ctx.message && 'photo' in ctx.message && ctx.message.photo && ctx.message.photo.length > 0) {
        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        const { validatePhoto } = await Promise.resolve().then(() => __importStar(require('../utils/fileValidation')));
        const validation = validatePhoto(photo.file_size, undefined, undefined);
        if (!validation.isValid) {
            await ctx.reply(`❌ ${validation.error}\n\nСпробуйте завантажити інше фото або натисніть "Пропустити".`);
            return;
        }
        state.photoFileId = photo.file_id;
        await ctx.reply(`✅ Фото завантажено${validation.fileSizeMB ? ` (${validation.fileSizeMB} MB)` : ''}`);
    }
    else {
        await ctx.reply('❌ Будь ласка, завантажте фото або натисніть "Пропустити".');
        return;
    }
    await ctx.reply('📎 Оберіть тип книги:', {
        reply_markup: {
            inline_keyboard: [
                [{ text: '📄 Файл (PDF/EPUB)', callback_data: 'type_file' }],
                [{ text: '🎧 Аудіокнига', callback_data: 'type_audio' }],
                [{ text: '🔗 Посилання', callback_data: 'type_link' }],
                [{ text: '❌ Скасувати', callback_data: 'cancel_add' }]
            ]
        }
    });
    return ctx.wizard.next();
}, async (ctx) => {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
        await ctx.reply('❌ Будь ласка, оберіть тип книги, використовуючи кнопки.\n\n' +
            '💡 Або натисніть /cancel для скасування');
        return;
    }
    const type = ctx.callbackQuery.data;
    if (type === 'cancel_add') {
        await ctx.answerCbQuery('❌ Скасовано');
        await ctx.reply('❌ Додавання книги скасовано');
        return ctx.scene?.leave();
    }
    if (!type.startsWith('type_')) {
        await ctx.answerCbQuery('❌ Невірний вибір');
        await ctx.reply('❌ Будь ласка, оберіть тип книги, використовуючи кнопки.\n\n' +
            '💡 Або натисніть /cancel для скасування');
        return;
    }
    const state = ctx.wizard?.state;
    state.bookType = type;
    if (type === 'type_file') {
        await ctx.answerCbQuery('📄 Файл обрано');
        await ctx.editMessageText('📎 Надішліть файл книги (PDF/EPUB/MOBI/FB2):\n\n💡 Або натисніть /cancel для скасування');
    }
    else if (type === 'type_audio') {
        await ctx.answerCbQuery('🎧 Аудіокнига обрана');
        await ctx.editMessageText('🎧 Надішліть аудіофайл книги (MP3/M4A):\n\n💡 Або натисніть /cancel для скасування');
    }
    else if (type === 'type_link') {
        await ctx.answerCbQuery('🔗 Посилання обрано');
        await ctx.editMessageText('🔗 Введіть посилання на книгу:\n\n💡 Або натисніть /cancel для скасування');
    }
    return ctx.wizard.next();
}, async (ctx) => {
    const state = ctx.wizard?.state;
    if (ctx.message && 'text' in ctx.message && ctx.message.text === '❌ Скасувати') {
        await ctx.reply('❌ Додавання книги скасовано');
        return ctx.scene?.leave();
    }
    if (state.bookType === 'type_file') {
        if (ctx.message && 'document' in ctx.message && ctx.message.document) {
            const document = ctx.message.document;
            const { validateDocument } = await Promise.resolve().then(() => __importStar(require('../utils/fileValidation')));
            const validation = validateDocument(document.file_size, document.mime_type, document.file_name);
            if (!validation.isValid) {
                await ctx.reply(`❌ ${validation.error}\n\n` +
                    '💡 Спробуйте інший файл або натисніть /cancel для скасування');
                return;
            }
            state.fileUrl = document.file_id;
            state.fileName = document.file_name || 'unknown.pdf';
            await ctx.reply(`✅ Файл завантажено: ${state.fileName}\n` +
                `📦 Розмір: ${validation.fileSizeMB} MB`);
        }
        else {
            await ctx.reply('❌ Будь ласка, надішліть файл документа.\n\n' +
                '💡 Або натисніть /cancel для скасування');
            return;
        }
    }
    else if (state.bookType === 'type_audio') {
        if (ctx.message && 'audio' in ctx.message && ctx.message.audio) {
            const audio = ctx.message.audio;
            const { validateAudio } = await Promise.resolve().then(() => __importStar(require('../utils/fileValidation')));
            const validation = validateAudio(audio.file_size, audio.mime_type, audio.file_name);
            if (!validation.isValid) {
                await ctx.reply(`❌ ${validation.error}\n\n` +
                    '💡 Спробуйте інший файл або натисніть /cancel для скасування');
                return;
            }
            state.fileUrl = audio.file_id;
            state.fileName = audio.file_name || 'audiobook.mp3';
            const duration = audio.duration ? `${Math.floor(audio.duration / 60)}хв` : '';
            await ctx.reply(`✅ Аудіофайл завантажено: ${state.fileName}\n` +
                `📦 Розмір: ${validation.fileSizeMB} MB ${duration}`);
        }
        else if (ctx.message && 'voice' in ctx.message && ctx.message.voice) {
            const voice = ctx.message.voice;
            const { validateAudio } = await Promise.resolve().then(() => __importStar(require('../utils/fileValidation')));
            const validation = validateAudio(voice.file_size, voice.mime_type, 'voice.ogg');
            if (!validation.isValid) {
                await ctx.reply(`❌ ${validation.error}`);
                return;
            }
            state.fileUrl = voice.file_id;
            state.fileName = 'voice_message.ogg';
            const duration = voice.duration ? `${Math.floor(voice.duration / 60)}хв` : '';
            await ctx.reply(`✅ Голосове повідомлення завантажено ${duration}`);
        }
        else {
            await ctx.reply('❌ Будь ласка, надішліть аудіофайл.\n\n' +
                '💡 Або натисніть /cancel для скасування');
            return;
        }
    }
    else if (state.bookType === 'type_link') {
        if (!ctx.message || !('text' in ctx.message)) {
            await ctx.reply('❌ Будь ласка, надішліть текст (посилання на книгу).\n\n' +
                '💡 Або натисніть /cancel для скасування');
            return;
        }
        const url = ctx.message.text.trim();
        if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
            state.fileUrl = url;
            await ctx.reply('✅ Посилання збережено');
        }
        else {
            await ctx.reply('❌ Будь ласка, введіть коректне посилання (http/https).\n\n' +
                '💡 Або натисніть /cancel для скасування');
            return;
        }
    }
    const allTags = await (0, tagFunctions_1.getAllTags)();
    if (allTags.length > 0) {
        const tagButtons = [];
        for (let i = 0; i < allTags.length; i += 2) {
            const row = [
                telegraf_1.Markup.button.callback(allTags[i].name, `preview_tag_${allTags[i].id}`)
            ];
            if (i + 1 < allTags.length) {
                row.push(telegraf_1.Markup.button.callback(allTags[i + 1].name, `preview_tag_${allTags[i + 1].id}`));
            }
            tagButtons.push(row);
        }
        tagButtons.push([
            telegraf_1.Markup.button.callback('✅ Далі (без тегів)', 'preview_skip_tags'),
            telegraf_1.Markup.button.callback('❌ Скасувати', 'cancel_add')
        ]);
        state.selectedTags = [];
        await ctx.reply('🏷️ *Додайте теги до книги (опціонально):*\n\n' +
            'Оберіть один або кілька тегів, які підходять до цієї книги.\n' +
            'Натисніть "Далі" коли закінчите або щоб пропустити цей крок.', {
            parse_mode: 'HTML',
            reply_markup: telegraf_1.Markup.inlineKeyboard(tagButtons).reply_markup
        });
        return ctx.wizard.next();
    }
    else {
        state.selectedTags = [];
        return ctx.wizard.next();
    }
}, async (ctx) => {
    const state = ctx.wizard?.state;
    if (ctx.callbackQuery && 'data' in ctx.callbackQuery && ctx.callbackQuery.data === 'cancel_add') {
        await ctx.answerCbQuery('❌ Скасовано');
        await ctx.reply('❌ Додавання книги скасовано');
        return ctx.scene?.leave();
    }
    if (ctx.callbackQuery && 'data' in ctx.callbackQuery && ctx.callbackQuery.data === 'preview_skip_tags') {
        await ctx.answerCbQuery('✅ Переходимо до підтвердження');
    }
    const bookData = {
        title: state.title,
        author: state.author,
        genre: state.genre,
        description: state.description,
        photo_file_id: state.photoFileId || 'default_book_cover'
    };
    let tagsText = '';
    if (state.selectedTags && state.selectedTags.length > 0) {
        const allTags = await (0, tagFunctions_1.getAllTags)();
        const selectedTagNames = state.selectedTags
            .map(tagId => allTags.find(t => t.id === tagId)?.name)
            .filter(Boolean)
            .join(', ');
        tagsText = `\n🏷️ Теги: ${selectedTagNames}`;
    }
    const previewText = `
📖 *${bookData.title}*
👤 ${bookData.author}
📚 ${bookData.genre}
📝 ${bookData.description}${tagsText}

${state.bookType === 'type_file' ? '📄 Доступна для завантаження' :
        state.bookType === 'type_link' ? '🔗 Доступна за посиланням' :
            '📖 Тільки фізична копія'}
    `.trim();
    if (bookData.photo_file_id && bookData.photo_file_id !== 'default_book_cover') {
        await ctx.replyWithPhoto(bookData.photo_file_id, {
            caption: previewText + '\n\n💡 Перевірте всі дані перед публікацією',
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '✅ Підтвердити і опублікувати', callback_data: 'confirm_book' }],
                    [{ text: '❌ Скасувати', callback_data: 'cancel_book' }]
                ]
            }
        });
    }
    else {
        await ctx.reply(previewText + '\n\n💡 Перевірте всі дані перед публікацією', {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '✅ Підтвердити і опублікувати', callback_data: 'confirm_book' }],
                    [{ text: '❌ Скасувати', callback_data: 'cancel_book' }]
                ]
            }
        });
    }
    return ctx.wizard.next();
}, async (ctx) => {
    if (!ctx.callbackQuery)
        return;
    if (ctx.callbackQuery && 'data' in ctx.callbackQuery && ctx.callbackQuery.data === 'confirm_book') {
        const state = ctx.wizard?.state;
        let file_type = 'physical';
        if (state.bookType === 'type_file')
            file_type = 'file';
        else if (state.bookType === 'type_link')
            file_type = 'link';
        const bookData = {
            title: state.title,
            author: state.author,
            genre: state.genre,
            description: state.description,
            photo_file_id: state.photoFileId || 'default_book_cover',
            file_url: state.fileUrl || null,
            file_type: file_type,
            file_name: state.fileName || null
        };
        const validation = (0, validation_1.validateBookData)(bookData);
        if (!validation.isValid) {
            if (ctx.callbackQuery) {
                await ctx.answerCbQuery('❌ Помилка валідації');
            }
            await ctx.reply('❌ *Помилка валідації:*\n\n' + validation.errors.join('\n') + '\n\nСпробуйте додати книгу ще раз.', { parse_mode: 'HTML' });
            return ctx.scene?.leave();
        }
        try {
            const bookId = await (0, models_1.addBook)(bookData);
            if (ctx.callbackQuery) {
                await ctx.answerCbQuery('✅ Книга додається...');
            }
            if (state.selectedTags && state.selectedTags.length > 0) {
                for (const tagId of state.selectedTags) {
                    try {
                        await (0, tagFunctions_1.addBookTag)(bookId, tagId);
                    }
                    catch (error) {
                        logger_1.logger.error('Error adding tag to book', error instanceof Error ? error : new Error(String(error)));
                    }
                }
            }
            await ctx.reply('✅ Книга успішно додана до бібліотеки!');
            const finalCaption = await (0, helpers_1.formatBookCaption)({ ...bookData, id: bookId, is_available: true });
            if (bookData.photo_file_id && bookData.photo_file_id !== 'default_book_cover') {
                await ctx.replyWithPhoto(bookData.photo_file_id, {
                    caption: finalCaption,
                    parse_mode: 'HTML'
                });
            }
            else {
                await ctx.reply(finalCaption, { parse_mode: 'HTML' });
            }
            await ctx.reply('✅ Книга успішно опублікована!', {
                reply_markup: telegraf_1.Markup.inlineKeyboard([
                    [telegraf_1.Markup.button.callback('🏠 Назад до адмін-панелі', 'back_to_admin')]
                ]).reply_markup
            });
        }
        catch (error) {
            logger_1.logger.error('Error saving book', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
            await ctx.reply('❌ Виникла помилка при додаванні книги. Спробуйте ще раз.');
        }
    }
    else {
        if (ctx.callbackQuery) {
            await ctx.answerCbQuery('❌ Скасовано');
        }
        await ctx.reply('❌ Додавання книги скасовано.');
    }
    return ctx.scene?.leave();
});
addBookScene.action(/preview_tag_(\d+)/, async (ctx) => {
    const state = ctx.wizard?.state;
    const tagId = parseInt(ctx.match[1]);
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
});
addBookScene.leave((ctx) => {
    const state = ctx.wizard?.state;
    if (state) {
        delete state.title;
        delete state.author;
        delete state.genre;
        delete state.description;
        delete state.photoFileId;
        delete state.bookType;
        delete state.fileUrl;
        delete state.fileName;
        delete state.selectedFormats;
        delete state.selectedTags;
        delete state.savedBookId;
        delete state.aiSuggestedTags;
    }
    logger_1.logger.debug('AddBookScene cleanup completed', { userId: ctx.from?.id });
});
addBookScene.action('back_to_admin', async (ctx) => {
    await ctx.answerCbQuery();
    const { isAdmin, getAdminStats, getPendingReviews, getPendingFeedbackMessages } = await Promise.resolve().then(() => __importStar(require('../database/models')));
    const { getAdminMenuKeyboard } = await Promise.resolve().then(() => __importStar(require('../keyboards/adminKeyboards')));
    const adminCheck = await isAdmin(ctx.from.id);
    if (!adminCheck) {
        await ctx.reply('❌ У вас немає доступу до адмін-панелі.');
        return;
    }
    const stats = await getAdminStats();
    const pendingReviews = await getPendingReviews();
    const pendingFeedback = await getPendingFeedbackMessages();
    const reviewsAlert = pendingReviews.length > 0
        ? `📝 Відгуків на модерацію: *${pendingReviews.length}* 🔔`
        : '✅ Всі відгуки оброблені';
    const feedbackAlert = pendingFeedback.length > 0
        ? `📞 Нових повідомлень: *${pendingFeedback.length}* 🔔`
        : '✅ Всі повідомлення прочитані';
    await ctx.editMessageText(`🛠️ *Панель адміністратора*\n\n` +
        `📊 *Статистика:*\n` +
        `📚 Книг в каталозі: ${stats.totalBooks}\n` +
        `${reviewsAlert}\n` +
        `${feedbackAlert}`, {
        parse_mode: 'HTML',
        reply_markup: getAdminMenuKeyboard(pendingReviews.length, pendingFeedback.length)
    });
});
exports.default = addBookScene;
//# sourceMappingURL=addBookScene.js.map