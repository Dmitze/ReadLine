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
exports.registerAIAssistantHandlers = registerAIAssistantHandlers;
const telegraf_1 = require("telegraf");
const aiHelper_1 = require("../utils/aiHelper");
const logger_1 = require("../utils/logger");
const mainKeyboards_1 = require("../keyboards/mainKeyboards");
const aiAssistantScene = new telegraf_1.Scenes.WizardScene('AI_ASSISTANT_SCENE', async (ctx) => {
    await ctx.reply('<b>🤖 AI-ПОМІЧНИК</b>\n\n' +
        '<b>Давай знайдемо ідеальну книгу!</b>\n\n' +
        'Цей помічник допоможе вам знайти ідеальну книгу на основі ваших вподобань та настрою. ' +
        'Відповідайте на кілька простих запитань, і я підберу для вас найкращі рекомендації.\n\n' +
        '<b>Що тебе цікавить сьогодні?</b>', {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [{ text: '🎭 Художня література', callback_data: 'interest_fiction' }],
                [{ text: '📚 Нон-фікшн', callback_data: 'interest_nonfiction' }],
                [{ text: '🎓 Навчальна', callback_data: 'interest_educational' }],
                [{ text: '🤷 Будь-що цікаве', callback_data: 'interest_any' }],
                [{ text: '❌ Скасувати', callback_data: 'cancel' }],
            ],
        },
    });
    return ctx.wizard.next();
}, async (ctx) => {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
        await ctx.reply('❌ Будь ласка, оберіть варіант за допомогою кнопок');
        return;
    }
    const data = ctx.callbackQuery.data;
    if (data === 'cancel') {
        await ctx.answerCbQuery('❌ Скасовано');
        await ctx.reply('❌ Підбір скасовано', {
            reply_markup: (0, mainKeyboards_1.getMainMenuKeyboard)(),
        });
        return ctx.scene.leave();
    }
    const state = ctx.wizard.state;
    state.aiInterest = data;
    await ctx.answerCbQuery();
    await ctx.editMessageText('<b>📱 Як ти хочеш користуватися книгою?</b>\n\n' +
        'В телеграмі книгу можна скачати, прослухати як аудіокнигу або перейти по посиланню:', {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [{ text: '⬇️ Скачати', callback_data: 'format_download' }],
                [{ text: '🎧 Прослухати', callback_data: 'format_audio' }],
                [{ text: '🔗 Посилання', callback_data: 'format_link' }],
                [{ text: '🤷 Будь-що', callback_data: 'format_any' }],
                [{ text: '⬅️ Назад', callback_data: 'back' }],
            ],
        },
    });
    return ctx.wizard.next();
}, async (ctx) => {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
        await ctx.reply('❌ Будь ласка, оберіть варіант за допомогою кнопок');
        return;
    }
    const data = ctx.callbackQuery.data;
    if (data === 'back') {
        await ctx.answerCbQuery('⬅️ Повертаємось');
        return ctx.wizard.selectStep(0);
    }
    const state = ctx.wizard.state;
    state.aiFormat = data;
    await ctx.answerCbQuery();
    await ctx.editMessageText('<b>😊 Який ваш настрій сьогодні?</b>\n\n' +
        'Це допоможе мені підібрати книгу, яка ідеально вам підійде:', {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [{ text: '😊 Веселий', callback_data: 'mood_happy' }],
                [{ text: '😌 Спокійний', callback_data: 'mood_calm' }],
                [{ text: '🤔 Задумливий', callback_data: 'mood_thoughtful' }],
                [{ text: '🏃 Енергійний', callback_data: 'mood_energetic' }],
                [{ text: '🤷 Будь-який', callback_data: 'mood_any' }],
                [{ text: '⬅️ Назад', callback_data: 'back' }],
            ],
        },
    });
    return ctx.wizard.next();
}, async (ctx) => {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
        await ctx.reply('❌ Будь ласка, оберіть варіант за допомогою кнопок');
        return;
    }
    const data = ctx.callbackQuery.data;
    if (data === 'back') {
        await ctx.answerCbQuery('⬅️ Повертаємось');
        return ctx.wizard.selectStep(1);
    }
    const state = ctx.wizard.state;
    state.aiMood = data;
    await ctx.answerCbQuery('🤖 Шукаю ідеальні книги...');
    await ctx.editMessageText('🤖 Аналізую твої вподобання та шукаю ідеальні книги...');
    const { getAllAvailableBooks } = await Promise.resolve().then(() => __importStar(require('../database/models')));
    const allBooks = await getAllAvailableBooks();
    if (allBooks.length === 0) {
        await ctx.reply('📭 На жаль, в бібліотеці поки немає книг', {
            reply_markup: (0, mainKeyboards_1.getMainMenuKeyboard)(),
        });
        return ctx.scene.leave();
    }
    const books = await (0, aiHelper_1.interactiveBookSelection)({
        interest: state.aiInterest || 'interest_any',
        format: state.aiFormat || 'format_any',
        mood: state.aiMood || 'mood_any',
    }, allBooks);
    if (books.length === 0) {
        await ctx.reply('😔 Не вдалося підібрати книги за вашими критеріями. Спробуйте інші параметри.', {
            reply_markup: (0, mainKeyboards_1.getMainMenuKeyboard)(),
        });
        return ctx.scene.leave();
    }
    const booksPerPage = 5;
    const page = 0;
    const paginatedBooks = books.slice(page * booksPerPage, (page + 1) * booksPerPage);
    const totalPages = Math.ceil(books.length / booksPerPage);
    let messageText = `<b>✨ Знайшов ${books.length} ідеальних ${books.length === 1 ? 'варіант' : 'варіанти'}!</b>\n\n`;
    messageText += '<b>Рекомендовано на основі ваших вподобань та настрою:</b>\n\n';
    messageText += `Сторінка 1 з ${totalPages}\n\n`;
    paginatedBooks.forEach((book, index) => {
        const rating = book.rating ? `⭐${book.rating.toFixed(1)}` : '';
        messageText += `${index + 1}. <b>${book.title}</b> - ${book.author}${rating ? ` ${rating}` : ''}\n`;
    });
    const keyboard = paginatedBooks.map((book) => [
        telegraf_1.Markup.button.callback(`📖 ${book.title}`, `view_book_${book.id}`),
    ]);
    const navButtons = [];
    if (totalPages > 1) {
        navButtons.push(telegraf_1.Markup.button.callback('Вперед ➡️', 'ai_result_page_1'));
    }
    if (navButtons.length > 0) {
        keyboard.push(navButtons);
    }
    keyboard.push([telegraf_1.Markup.button.callback('⬅️ До меню', 'leave_ai_assistant')]);
    await ctx.reply(messageText, {
        parse_mode: 'HTML',
        reply_markup: telegraf_1.Markup.inlineKeyboard(keyboard).reply_markup,
    });
    if (!ctx.session) {
        ctx.session = {};
    }
    ctx.session.aiResultBooks = books;
    logger_1.logger.userAction(ctx.from?.id || 0, 'ai_assistant_selection', {
        interest: state.aiInterest,
        format: state.aiFormat,
        mood: state.aiMood,
        booksFound: books.length,
    });
    return ctx.scene.leave();
});
function registerAIAssistantHandlers(bot) {
    bot.action(/ai_result_page_(\d+)/, async (ctx) => {
        await ctx.answerCbQuery();
        const page = parseInt(ctx.match?.[1] || '0', 10);
        const allBooks = ctx.session?.aiResultBooks || [];
        if (!allBooks || allBooks.length === 0) {
            await ctx.answerCbQuery('❌ Помилка при завантаженні даних', { show_alert: true });
            return;
        }
        const booksPerPage = 5;
        const paginatedBooks = allBooks.slice(page * booksPerPage, (page + 1) * booksPerPage);
        const totalPages = Math.ceil(allBooks.length / booksPerPage);
        let messageText = '<b>✨ Результати пошуку</b>\n\n';
        messageText += '<b>Рекомендовано на основі ваших вподобань та настрою:</b>\n\n';
        messageText += `Сторінка ${page + 1} з ${totalPages}\n\n`;
        paginatedBooks.forEach((book, index) => {
            const rating = book.rating ? `⭐${book.rating.toFixed(1)}` : '';
            messageText += `${page * booksPerPage + index + 1}. <b>${book.title}</b> - ${book.author}${rating ? ` ${rating}` : ''}\n`;
        });
        const keyboard = paginatedBooks.map((book) => [
            telegraf_1.Markup.button.callback(`📖 ${book.title}`, `view_book_${book.id}`),
        ]);
        const navButtons = [];
        if (page > 0) {
            navButtons.push(telegraf_1.Markup.button.callback('⬅️ Назад', `ai_result_page_${page - 1}`));
        }
        if (page + 1 < totalPages) {
            navButtons.push(telegraf_1.Markup.button.callback('Вперед ➡️', `ai_result_page_${page + 1}`));
        }
        if (navButtons.length > 0) {
            keyboard.push(navButtons);
        }
        keyboard.push([telegraf_1.Markup.button.callback('⬅️ До меню', 'leave_ai_assistant')]);
        await ctx.editMessageText(messageText, {
            parse_mode: 'HTML',
            reply_markup: telegraf_1.Markup.inlineKeyboard(keyboard).reply_markup,
        });
    });
    bot.action('leave_ai_assistant', async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.reply('Виберіть дію:', {
            reply_markup: (0, mainKeyboards_1.getMainMenuKeyboard)(),
        });
        await ctx.scene.leave();
    });
}
aiAssistantScene.leave((ctx) => {
    const state = ctx.wizard?.state;
    if (state) {
        delete state.aiInterest;
        delete state.aiFormat;
        delete state.aiMood;
    }
    logger_1.logger.debug('AIAssistantScene cleanup completed', { userId: ctx.from?.id });
});
exports.default = aiAssistantScene;
//# sourceMappingURL=aiAssistantScene.js.map