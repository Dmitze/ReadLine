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
const logger_1 = require("../utils/logger");
const helpers_1 = require("../utils/helpers");
const genres_1 = require("../constants/genres");
const editBookScene = new telegraf_1.Scenes.WizardScene('EDIT_BOOK_SCENE', async (ctx) => {
    const state = ctx.scene.state;
    logger_1.logger.info('EditBookScene step 1 entered', {
        bookId: state.bookId,
        hasSceneState: !!ctx.scene.state,
        userId: ctx.from?.id
    });
    if (!state.bookId) {
        logger_1.logger.error('EditBookScene: bookId not found in state', {
            state,
            userId: ctx.from?.id,
        });
        await ctx.reply('❌ Помилка: ID книги не знайдено');
        return ctx.scene.leave();
    }
    const book = await (0, models_1.getBookById)(state.bookId);
    if (!book) {
        logger_1.logger.error('EditBookScene: book not found', {
            bookId: state.bookId,
            userId: ctx.from?.id,
        });
        await ctx.reply('❌ Книга не знайдена');
        return ctx.scene.leave();
    }
    const wizardState = ctx.wizard.state;
    wizardState.book = book;
    const bookInfo = `
<b>📖 Поточні дані книги:</b>${(0, helpers_1.getBookIdText)(book.id)}

<b>📚 Назва:</b> ${book.title}
<b>👤 Автор:</b> ${book.author}
<b>🎭 Жанр:</b> ${book.genre}
<b>📝 Опис:</b> ${book.description}
<b>📊 Рейтинг:</b> ${book.rating || 0}/5 (${book.reviews_count || 0} відгуків)
<b>📥 Завантажень:</b> ${book.downloads_count || 0}
<b>✅ Доступна:</b> ${book.is_available ? 'Так' : 'Ні'}
      `.trim();
    await ctx.reply(bookInfo, {
        parse_mode: 'HTML',
        reply_markup: telegraf_1.Markup.inlineKeyboard([
            [telegraf_1.Markup.button.callback('✏️ Назва', 'edit_title')],
            [telegraf_1.Markup.button.callback('✏️ Автор', 'edit_author')],
            [telegraf_1.Markup.button.callback('✏️ Жанр', 'edit_genre')],
            [telegraf_1.Markup.button.callback('✏️ Опис', 'edit_description')],
            [telegraf_1.Markup.button.callback('🖼️ Обкладинка', 'edit_photo')],
            [telegraf_1.Markup.button.callback('✅ Доступність', 'edit_availability')],
            [telegraf_1.Markup.button.callback('💾 Зберегти', 'save_changes')],
            [telegraf_1.Markup.button.callback('⬅️ Назад до списку', 'back_to_list')],
            [telegraf_1.Markup.button.callback('❌ Скасувати', 'cancel_edit')],
        ]).reply_markup,
    });
    return ctx.wizard.next();
}, async (ctx) => {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
        await ctx.reply('❌ Будь ласка, використовуйте кнопки для вибору');
        return;
    }
    const action = ctx.callbackQuery.data;
    const state = ctx.wizard.state;
    if (action === 'cancel_edit') {
        await ctx.answerCbQuery('Скасовано');
        await ctx.reply('❌ Редагування скасовано');
        return ctx.scene.leave();
    }
    if (action === 'back_to_list') {
        await ctx.answerCbQuery('Повертаємось до списку книг');
        await ctx.reply('⬅️ Повертаємось до списку книг');
        return ctx.scene.enter('MANAGE_BOOKS_SCENE');
    }
    if (action === 'save_changes') {
        const updates = state.updates || {};
        if (Object.keys(updates).length === 0) {
            await ctx.answerCbQuery('Немає змін для збереження');
            await ctx.reply('ℹ️ Ви не внесли жодних змін.\n\n' +
                'Оберіть поле для редагування з меню вище або натисніть "❌ Скасувати".');
            return;
        }
        if (state.book) {
            await (0, models_1.updateBook)(state.book.id, updates);
        }
        await ctx.answerCbQuery('✅ Зміни збережено!');
        const changedFields = Object.keys(updates)
            .map((key) => {
            const fieldNames = {
                title: 'Назва',
                author: 'Автор',
                genre: 'Жанр',
                description: 'Опис',
                photo_file_id: 'Фото',
                is_available: 'Доступність',
            };
            return `✅ ${fieldNames[key] || key}`;
        })
            .join('\n');
        await ctx.reply('✅ *Книгу успішно оновлено!*\n\n' + `Змінено:\n${changedFields}`, {
            parse_mode: 'Markdown',
        });
        if (ctx.from && state.book) {
            logger_1.logger.adminAction(ctx.from.id, 'edit_book', { bookId: state.book.id, updates });
        }
        setTimeout(() => {
            ctx.scene.leave().catch((err) => {
                logger_1.logger.error('Error leaving edit scene', { error: err });
            });
        }, 500);
        return;
    }
    state.editingField = action.replace('edit_', '');
    await ctx.answerCbQuery();
    const fieldNames = {
        title: 'назву',
        author: 'автора',
        genre: 'жанр',
        description: 'опис',
        photo: 'фото',
        availability: 'доступність',
    };
    const fieldName = (state.editingField && fieldNames[state.editingField]) || 'значення';
    if (state.editingField === 'availability') {
        await ctx.editMessageReplyMarkup({
            inline_keyboard: [
                [telegraf_1.Markup.button.callback('✅ Доступна', 'set_available_true')],
                [telegraf_1.Markup.button.callback('❌ Недоступна', 'set_available_false')],
                [telegraf_1.Markup.button.callback('⬅️ Назад', 'back_to_menu')],
            ],
        });
    }
    else if (state.editingField === 'photo') {
        await ctx.reply('🖼️ Надішліть нове фото обкладинки або натисніть /skip щоб пропустити');
    }
    else if (state.editingField === 'genre') {
        state.selectedGenres = state.book?.genre
            ? state.book.genre.split('\n').filter(Boolean)
            : [];
        const selectedGenres = state.selectedGenres || [];
        const popularGenres = genres_1.POPULAR_GENRES;
        const otherGenres = genres_1.OTHER_GENRES;
        const popularKeyboard = [];
        for (let i = 0; i < popularGenres.length; i += 2) {
            const row = [
                telegraf_1.Markup.button.callback(`${selectedGenres.includes(popularGenres[i]) ? '✅' : ''} ${popularGenres[i]}`, `genre_${popularGenres[i]}`),
            ];
            if (i + 1 < popularGenres.length) {
                row.push(telegraf_1.Markup.button.callback(`${selectedGenres.includes(popularGenres[i + 1]) ? '✅' : ''} ${popularGenres[i + 1]}`, `genre_${popularGenres[i + 1]}`));
            }
            popularKeyboard.push(row);
        }
        const otherKeyboard = [];
        for (let i = 0; i < otherGenres.length; i += 2) {
            const row = [
                telegraf_1.Markup.button.callback(`${selectedGenres.includes(otherGenres[i]) ? '✅' : ''} ${otherGenres[i]}`, `genre_${otherGenres[i]}`),
            ];
            if (i + 1 < otherGenres.length) {
                row.push(telegraf_1.Markup.button.callback(`${selectedGenres.includes(otherGenres[i + 1]) ? '✅' : ''} ${otherGenres[i + 1]}`, `genre_${otherGenres[i + 1]}`));
            }
            otherKeyboard.push(row);
        }
        const keyboard = [
            ...popularKeyboard,
            [telegraf_1.Markup.button.callback('📖 Більше жанрів...', 'show_more_genres')],
            [telegraf_1.Markup.button.callback('✅ Готово', 'genres_done')],
            [telegraf_1.Markup.button.callback('⬅️ Назад', 'back_to_menu')],
        ];
        const selectedText = selectedGenres.length > 0 ? `\n\n✅ Вибрано: ${selectedGenres.join(', ')}` : '';
        await ctx.reply(`🎭 Оберіть жанри (до 5):${selectedText}\n\n📚 *Популярні жанри:*`, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard },
        });
    }
    else {
        await ctx.reply(`✏️ Введіть нове значення для поля "${fieldName}":`);
    }
    return ctx.wizard.next();
}, async (ctx) => {
    const state = ctx.wizard.state;
    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
        const action = ctx.callbackQuery.data;
        if (action === 'back_to_menu') {
            await ctx.answerCbQuery();
            ctx.wizard.selectStep(0);
            return;
        }
        if (action.startsWith('genre_')) {
            const selectedGenre = action.replace('genre_', '');
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
                    await ctx.answerCbQuery('❌ Максимум 5 жанрів!', { show_alert: true });
                    return;
                }
                state.selectedGenres.push(selectedGenre);
                await ctx.answerCbQuery(`✅ ${selectedGenre} додано (${state.selectedGenres.length}/5)`);
            }
            const popularGenres = genres_1.POPULAR_GENRES;
            const popularKeyboard = [];
            for (let i = 0; i < popularGenres.length; i += 2) {
                const row = [
                    telegraf_1.Markup.button.callback(`${state.selectedGenres.includes(popularGenres[i]) ? '✅' : ''} ${popularGenres[i]}`, `genre_${popularGenres[i]}`),
                ];
                if (i + 1 < popularGenres.length) {
                    row.push(telegraf_1.Markup.button.callback(`${state.selectedGenres.includes(popularGenres[i + 1]) ? '✅' : ''} ${popularGenres[i + 1]}`, `genre_${popularGenres[i + 1]}`));
                }
                popularKeyboard.push(row);
            }
            const keyboard = [
                ...popularKeyboard,
                [telegraf_1.Markup.button.callback('📖 Більше жанрів...', 'show_more_genres')],
                [telegraf_1.Markup.button.callback('✅ Готово', 'genres_done')],
                [telegraf_1.Markup.button.callback('⬅️ Назад', 'back_to_menu')],
            ];
            const selectedText = state.selectedGenres.length > 0
                ? `\n\n✅ Вибрано: ${state.selectedGenres.join(', ')}`
                : '';
            await ctx.editMessageText(`🎭 Оберіть жанри (до 5):${selectedText}\n\n📚 *Популярні жанри:*`, {
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: keyboard },
            });
            return;
        }
        if (action === 'show_more_genres') {
            const otherGenres = genres_1.OTHER_GENRES;
            const otherKeyboard = [];
            for (let i = 0; i < otherGenres.length; i += 2) {
                const row = [
                    telegraf_1.Markup.button.callback(`${state.selectedGenres && state.selectedGenres.includes(otherGenres[i]) ? '✅' : ''} ${otherGenres[i]}`, `genre_${otherGenres[i]}`),
                ];
                if (i + 1 < otherGenres.length) {
                    row.push(telegraf_1.Markup.button.callback(`${state.selectedGenres && state.selectedGenres.includes(otherGenres[i + 1]) ? '✅' : ''} ${otherGenres[i + 1]}`, `genre_${otherGenres[i + 1]}`));
                }
                otherKeyboard.push(row);
            }
            const keyboard = [
                ...otherKeyboard,
                [telegraf_1.Markup.button.callback('✅ Готово', 'genres_done')],
                [telegraf_1.Markup.button.callback('⬅️ Назад до популярних', 'back_to_popular_genres')],
            ];
            const selectedText = state.selectedGenres && state.selectedGenres.length > 0
                ? `\n\n✅ Вибрано: ${state.selectedGenres.join(', ')}`
                : '';
            await ctx.editMessageText(`🎭 Оберіть жанри (до 5):${selectedText}\n\n📚 *Інші жанри:*`, {
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: keyboard },
            });
            await ctx.answerCbQuery();
            return;
        }
        if (action === 'back_to_popular_genres') {
            const popularGenres = genres_1.POPULAR_GENRES;
            const popularKeyboard = [];
            for (let i = 0; i < popularGenres.length; i += 2) {
                const row = [
                    telegraf_1.Markup.button.callback(`${state.selectedGenres && state.selectedGenres.includes(popularGenres[i]) ? '✅' : ''} ${popularGenres[i]}`, `genre_${popularGenres[i]}`),
                ];
                if (i + 1 < popularGenres.length) {
                    row.push(telegraf_1.Markup.button.callback(`${state.selectedGenres && state.selectedGenres.includes(popularGenres[i + 1]) ? '✅' : ''} ${popularGenres[i + 1]}`, `genre_${popularGenres[i + 1]}`));
                }
                popularKeyboard.push(row);
            }
            const keyboard = [
                ...popularKeyboard,
                [telegraf_1.Markup.button.callback('📖 Більше жанрів...', 'show_more_genres')],
                [telegraf_1.Markup.button.callback('✅ Готово', 'genres_done')],
                [telegraf_1.Markup.button.callback('⬅️ Назад', 'back_to_menu')],
            ];
            const selectedText = state.selectedGenres && state.selectedGenres.length > 0
                ? `\n\n✅ Вибрано: ${state.selectedGenres.join(', ')}`
                : '';
            await ctx.editMessageText(`🎭 Оберіть жанри (до 5):${selectedText}\n\n📚 *Популярні жанри:*`, {
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: keyboard },
            });
            await ctx.answerCbQuery();
            return;
        }
        if (action === 'genres_done') {
            if (!state.selectedGenres || state.selectedGenres.length === 0) {
                await ctx.answerCbQuery('❌ Оберіть хоча б один жанр!', { show_alert: true });
                return;
            }
            state.updates = state.updates || {};
            state.updates.genre = state.selectedGenres.join('\n');
            await ctx.answerCbQuery(`✅ Жанри змінено (${state.selectedGenres.length} обрано)`);
            ctx.wizard.selectStep(0);
            if (!state.book) {
                await ctx.reply('❌ Помилка: дані книги відсутні');
                return ctx.scene.leave();
            }
            await ctx.editMessageText('<b>📝 Редагування книги</b>\n\n' +
                `📖 ${state.book.title}\n` +
                `👤 ${state.book.author}\n\n` +
                `✅ Жанри змінено на: ${state.selectedGenres.join(', ')}\n\n` +
                'Оберіть що хочете змінити або збережіть зміни:', {
                parse_mode: 'HTML',
                reply_markup: telegraf_1.Markup.inlineKeyboard([
                    [telegraf_1.Markup.button.callback('📖 Назва', 'edit_title')],
                    [telegraf_1.Markup.button.callback('👤 Автор', 'edit_author')],
                    [telegraf_1.Markup.button.callback('📚 Жанр', 'edit_genre')],
                    [telegraf_1.Markup.button.callback('📝 Опис', 'edit_description')],
                    [telegraf_1.Markup.button.callback('🖼️ Обкладинка', 'edit_photo')],
                    [telegraf_1.Markup.button.callback('✅ Доступність', 'edit_availability')],
                    [telegraf_1.Markup.button.callback('💾 Зберегти', 'save_changes')],
                    [telegraf_1.Markup.button.callback('⬅️ Назад до списку', 'back_to_list')],
                    [telegraf_1.Markup.button.callback('❌ Скасувати', 'cancel_edit')],
                ]).reply_markup,
            });
            return;
        }
        if (action === 'set_available_true' || action === 'set_available_false') {
            const isAvailable = action === 'set_available_true';
            state.updates = state.updates || {};
            state.updates.is_available = isAvailable;
            await ctx.answerCbQuery('✅ Змінено');
            ctx.wizard.selectStep(0);
            const { Markup } = await Promise.resolve().then(() => __importStar(require('telegraf')));
            if (!state.book) {
                await ctx.reply('❌ Помилка: дані книги відсутні');
                return ctx.scene.leave();
            }
            await ctx.editMessageText('<b>📝 Редагування книги</b>\n\n' +
                `📖 ${state.book.title}\n` +
                `👤 ${state.book.author}\n\n` +
                `✅ Доступність змінено на: ${isAvailable ? 'Доступна' : 'Недоступна'}\n\n` +
                'Оберіть що хочете змінити або збережіть зміни:', {
                parse_mode: 'HTML',
                reply_markup: Markup.inlineKeyboard([
                    [Markup.button.callback('📖 Назва', 'edit_title')],
                    [Markup.button.callback('👤 Автор', 'edit_author')],
                    [Markup.button.callback('📚 Жанр', 'edit_genre')],
                    [Markup.button.callback('📝 Опис', 'edit_description')],
                    [Markup.button.callback('🖼️ Обкладинка', 'edit_photo')],
                    [Markup.button.callback('✅ Доступність', 'edit_availability')],
                    [Markup.button.callback('💾 Зберегти', 'save_changes')],
                    [Markup.button.callback('⬅️ Назад до списку', 'back_to_list')],
                    [Markup.button.callback('❌ Скасувати', 'cancel_edit')],
                ]).reply_markup,
            });
            return;
        }
    }
    if (ctx.message && 'text' in ctx.message && ctx.message.text === '/skip') {
        await ctx.reply('⏭️ Пропущено. Використайте меню вище для продовження.');
        return;
    }
    if (state.editingField === 'photo') {
        if (ctx.message &&
            'photo' in ctx.message &&
            ctx.message.photo &&
            ctx.message.photo.length > 0) {
            const photo = ctx.message.photo[ctx.message.photo.length - 1];
            if (photo.file_size && photo.file_size > 10 * 1024 * 1024) {
                await ctx.reply('❌ Фото занадто велике. Максимум 10 МБ. Спробуйте інше фото або /skip');
                return;
            }
            state.updates = state.updates || {};
            state.updates.photo_file_id = photo.file_id;
            ctx.wizard.selectStep(0);
            if (!state.book) {
                await ctx.reply('❌ Помилка: дані книги відсутні');
                return ctx.scene.leave();
            }
            await ctx.replyWithPhoto(photo.file_id, {
                caption: '<b>📝 Редагування книги</b>\n\n' +
                    `📖 ${state.book.title}\n` +
                    `👤 ${state.book.author}\n\n` +
                    '✅ Нове фото обкладинки збережено!\n\n' +
                    'Оберіть що хочете змінити або збережіть зміни:',
                parse_mode: 'HTML',
                reply_markup: telegraf_1.Markup.inlineKeyboard([
                    [telegraf_1.Markup.button.callback('✏️ Назва', 'edit_title')],
                    [telegraf_1.Markup.button.callback('✏️ Автор', 'edit_author')],
                    [telegraf_1.Markup.button.callback('✏️ Жанр', 'edit_genre')],
                    [telegraf_1.Markup.button.callback('✏️ Опис', 'edit_description')],
                    [telegraf_1.Markup.button.callback('🖼️ Обкладинка', 'edit_photo')],
                    [telegraf_1.Markup.button.callback('✅ Доступність', 'edit_availability')],
                    [telegraf_1.Markup.button.callback('💾 Зберегти', 'save_changes')],
                    [telegraf_1.Markup.button.callback('⬅️ Назад до списку', 'back_to_list')],
                    [telegraf_1.Markup.button.callback('❌ Скасувати', 'cancel_edit')],
                ]).reply_markup,
            });
            return;
        }
        else if (ctx.message && 'text' in ctx.message) {
            await ctx.reply('❌ Будь ласка, надішліть фото (не текст) або /skip для пропуску');
            return;
        }
        else {
            await ctx.reply('❌ Будь ласка, надішліть фото або /skip для пропуску');
            return;
        }
    }
    if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply('❌ Будь ласка, надішліть текст');
        return;
    }
    const newValue = ctx.message.text;
    if (newValue.length < 2) {
        await ctx.reply('❌ Значення занадто коротке. Спробуйте ще раз:');
        return;
    }
    state.updates = state.updates || {};
    if (state.editingField) {
        state.updates[state.editingField] = newValue;
    }
    await ctx.answerCbQuery?.();
    ctx.wizard.selectStep(0);
    if (!state.book) {
        await ctx.reply('❌ Помилка: дані книги відсутні');
        return ctx.scene.leave();
    }
    await ctx.reply('<b>📝 Редагування книги</b>\n\n' +
        `📖 ${state.book.title}\n` +
        `👤 ${state.book.author}\n\n` +
        `✅ Поле "${state.editingField}" оновлено\n\n` +
        'Оберіть що хочете змінити або збережіть зміни:', {
        parse_mode: 'HTML',
        reply_markup: telegraf_1.Markup.inlineKeyboard([
            [telegraf_1.Markup.button.callback('✏️ Назва', 'edit_title')],
            [telegraf_1.Markup.button.callback('✏️ Автор', 'edit_author')],
            [telegraf_1.Markup.button.callback('✏️ Жанр', 'edit_genre')],
            [telegraf_1.Markup.button.callback('✏️ Опис', 'edit_description')],
            [telegraf_1.Markup.button.callback('🖼️ Обкладинка', 'edit_photo')],
            [telegraf_1.Markup.button.callback('✅ Доступність', 'edit_availability')],
            [telegraf_1.Markup.button.callback('💾 Зберегти', 'save_changes')],
            [telegraf_1.Markup.button.callback('⬅️ Назад до списку', 'back_to_list')],
            [telegraf_1.Markup.button.callback('❌ Скасувати', 'cancel_edit')],
        ]).reply_markup,
    });
    return;
});
exports.default = editBookScene;
//# sourceMappingURL=editBookScene.js.map