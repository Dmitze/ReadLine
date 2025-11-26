"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.otherLanguages = exports.popularLanguages = void 0;
exports.showLanguageMenu = showLanguageMenu;
exports.showAllLanguages = showAllLanguages;
exports.showISBNInput = showISBNInput;
const telegraf_1 = require("telegraf");
const utils_1 = require("./utils");
exports.popularLanguages = [
    'Українська',
    'Російська',
    'Англійська',
    'Німецька',
    'Французька',
];
exports.otherLanguages = [
    'Іспанська',
    'Італійська',
    'Португальська',
    'Польська',
    'Чеська',
    'Угорська',
    'Румунська',
    'Болгарська',
    'Сербська',
    'Японська',
    'Китайська',
    'Корейська',
];
async function showLanguageMenu(ctx, state) {
    const userId = ctx.from?.id;
    if (!userId) {
        await ctx.reply('❌ Помилка: користувач не ідентифікований');
        return;
    }
    const keyboard = [];
    for (let i = 0; i < exports.popularLanguages.length; i += 2) {
        const row = [];
        row.push({ text: exports.popularLanguages[i], callback_data: `lang_popular_${i}_${userId}` });
        if (i + 1 < exports.popularLanguages.length) {
            row.push({ text: exports.popularLanguages[i + 1], callback_data: `lang_popular_${i + 1}_${userId}` });
        }
        keyboard.push(row);
    }
    keyboard.push([{ text: '📚 Інші мови', callback_data: `show_all_languages_${userId}` }]);
    await ctx.reply(`${(0, utils_1.getProgress)(7)}\n\n🌍 <b>ВИБЕРІТЬ МОВУ КНИГИ:</b>`, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: keyboard },
    });
}
async function showAllLanguages(ctx) {
    const userId = ctx.from?.id;
    if (!userId) {
        await ctx.reply('❌ Помилка: користувач не ідентифікований');
        return;
    }
    const allLanguages = [...exports.popularLanguages, ...exports.otherLanguages];
    const keyboard = [];
    for (let i = 0; i < allLanguages.length; i += 2) {
        const row = [];
        row.push({ text: allLanguages[i], callback_data: `lang_all_${i}_${userId}` });
        if (i + 1 < allLanguages.length) {
            row.push({ text: allLanguages[i + 1], callback_data: `lang_all_${i + 1}_${userId}` });
        }
        keyboard.push(row);
    }
    keyboard.push([{ text: '✅ Назад', callback_data: `lang_back_${userId}` }]);
    await ctx.editMessageText(`${(0, utils_1.getProgress)(7)}\n\n🌍 <b>ВИБЕРІТЬ МОВУ КНИГИ:</b>`, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: keyboard },
    });
}
async function showISBNInput(ctx) {
    await ctx.reply(`${(0, utils_1.getProgress)(6)}\n\n📚 <b>ISBN (опціонально)</b>\n\n` +
        'ISBN - унікальний ідентифікатор книги. Якщо не знаєте, напишіть "Пропустити".\n\n' +
        'Приклад: 978-3-16-148410-0', {
        parse_mode: 'HTML',
        reply_markup: telegraf_1.Markup.inlineKeyboard([
            [{ text: '⏭️ Пропустити', callback_data: `skip_isbn_${ctx.from?.id}` }],
        ]).reply_markup,
    });
}
//# sourceMappingURL=languageStep.js.map