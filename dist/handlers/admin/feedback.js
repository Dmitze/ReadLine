"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const telegraf_1 = require("telegraf");
const models_1 = require("../../database/models");
const adminKeyboards_1 = require("../../keyboards/adminKeyboards");
const logger_1 = require("../../utils/logger");
const escapeHtml = (text) => {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};
exports.default = (bot) => {
    bot.action('view_feedback', async (ctx) => {
        (async () => {
            await ctx.answerCbQuery('Завантаження нових повідомлень...');
            const adminCheck = await (0, models_1.isAdmin)(ctx.from.id);
            if (!adminCheck) {
                await ctx.reply('❌ У вас немає доступу до цієї функції.');
                return;
            }
            const messages = await (0, models_1.getPendingFeedbackMessages)();
            const allMessages = await (0, models_1.getAllFeedbackMessages)();
            logger_1.logger.info('Feedback messages loaded', {
                pending: messages.length,
                total: allMessages.length,
            });
            if (messages.length === 0) {
                await ctx.reply('✅ <b>Немає нових повідомлень</b>\n\n' +
                    "Всі повідомлення зворотного зв'язку прочитані.\n\n" +
                    '💡 Користувачі можуть надіслати повідомлення через:\n' +
                    "Головне меню → 📞 Зворотний зв'язок", {
                    parse_mode: 'Markdown',
                    reply_markup: telegraf_1.Markup.inlineKeyboard([
                        [telegraf_1.Markup.button.callback('📜 Показати історію', 'view_feedback_history')],
                        [telegraf_1.Markup.button.callback('🏠 Головна', 'home')],
                    ]).reply_markup,
                });
                return;
            }
            await ctx.reply("📞 <b>Нові повідомлення зворотного зв'язку</b>\n\n" +
                `Нових: ${messages.length}\n` +
                `Всього в історії: ${allMessages.length}`, { parse_mode: 'Markdown' });
            for (const msg of messages) {
                try {
                    if (!msg.message || msg.message.trim() === '') {
                        logger_1.logger.warn('Empty feedback message', { messageId: msg.id });
                        await ctx.reply(`⚠️ *Повідомлення #${msg.id}*\n\n` +
                            '❌ Текст повідомлення відсутній або пошкоджений.\n\n' +
                            `👤 Від: ${msg.user_name || 'Користувач'}\n` +
                            `🆔 User ID: \`${msg.user_id}\``, { parse_mode: 'Markdown' });
                        continue;
                    }
                    const statusEmoji = msg.status === 'pending'
                        ? '🔔 НОВЕ'
                        : msg.status === 'read'
                            ? '✅ Прочитано'
                            : '💬 Відповіли';
                    const safeName = escapeHtml(msg.user_name || 'Користувач');
                    const safeUsername = msg.user_username ? escapeHtml(msg.user_username) : '';
                    const safeMessage = escapeHtml(msg.message);
                    const safeCreatedAt = escapeHtml(new Date(msg.created_at).toLocaleString('uk-UA'));
                    const safeReadAt = msg.read_at
                        ? escapeHtml(new Date(msg.read_at).toLocaleString('uk-UA'))
                        : '';
                    let feedbackText = `📞 <b>Повідомлення #${msg.id}</b> ${statusEmoji}\n\n`;
                    feedbackText += `👤 Від: ${safeName}\n`;
                    feedbackText += `🆔 User ID: <code>${msg.user_id}</code>\n`;
                    if (msg.user_username) {
                        feedbackText += `📱 Username: @${safeUsername}\n`;
                    }
                    feedbackText += `\n💬 <b>Повідомлення:</b>\n"${safeMessage}"\n\n`;
                    feedbackText += `📅 Дата: ${safeCreatedAt}`;
                    if (msg.read_at) {
                        feedbackText += `\n👁️ Прочитано: ${safeReadAt}`;
                    }
                    await ctx.reply(feedbackText, {
                        parse_mode: 'HTML',
                        reply_markup: (0, adminKeyboards_1.getFeedbackActionKeyboard)(msg.id, msg.user_id),
                    });
                    await new Promise((resolve) => setTimeout(resolve, 100));
                }
                catch (msgError) {
                    logger_1.logger.error('Error displaying feedback message', msgError instanceof Error ? msgError : new Error(String(msgError)), { feedbackId: msg.id });
                    await ctx.reply(`❌ Помилка при відображенні повідомлення #${msg.id}\n` +
                        `Деталі: ${msgError instanceof Error ? msgError.message : String(msgError)}`);
                }
            }
            await ctx.reply('✅ Всі нові повідомлення завантажено', {
                reply_markup: telegraf_1.Markup.inlineKeyboard([
                    [telegraf_1.Markup.button.callback('🔄 Оновити', 'view_feedback')],
                    [telegraf_1.Markup.button.callback('📜 Показати історію', 'view_feedback_history')],
                    [telegraf_1.Markup.button.callback('🏠 Головна', 'home')],
                ]).reply_markup,
            });
        })().catch((error) => {
            logger_1.logger.error('Error showing feedback messages', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
            ctx.reply('❌ Виникла помилка при отриманні повідомлень.\n\n' +
                `Деталі: ${error instanceof Error ? error.message : String(error)}`);
        });
        return;
    });
    bot.action(/reply_feedback_(\d+)/, async (ctx) => {
        (async () => {
            if (!ctx.from?.id) {
                await ctx.answerCbQuery('❌ Не вдалося ідентифікувати користувача.');
                return;
            }
            const adminCheck = await (0, models_1.isAdmin)(ctx.from.id);
            if (!adminCheck) {
                await ctx.answerCbQuery('❌ У вас немає доступу до цієї функції.');
                return;
            }
            const match = ctx.match;
            if (!match || !match[1]) {
                await ctx.answerCbQuery('❌ Помилка: не вдалося отримати ID повідомлення.');
                return;
            }
            const feedbackId = parseInt(match[1]);
            const allMessages = await (0, models_1.getAllFeedbackMessages)();
            const message = allMessages.find((m) => m.id === feedbackId);
            if (!message) {
                await ctx.answerCbQuery('❌ Повідомлення не знайдено');
                return;
            }
            await ctx.answerCbQuery('✉️ Відкриваю форму відповіді...');
            await ctx.scene.enter('REPLY_FEEDBACK_SCENE', {
                feedbackId: message.id,
                userId: message.user_id,
                userName: message.user_name || 'Користувач',
                originalMessage: message.message,
            });
        })().catch((error) => {
            logger_1.logger.error('Error opening reply form', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
            ctx.answerCbQuery('❌ Помилка при відкритті форми відповіді');
        });
        return;
    });
    bot.action(/mark_feedback_read_(\d+)/, async (ctx) => {
        (async () => {
            if (!ctx.from?.id) {
                await ctx.answerCbQuery('❌ Не вдалося ідентифікувати користувача.');
                return;
            }
            const adminCheck = await (0, models_1.isAdmin)(ctx.from.id);
            if (!adminCheck) {
                await ctx.answerCbQuery('❌ У вас немає доступу до цієї функції.');
                return;
            }
            const match = ctx.match;
            if (!match || !match[1]) {
                await ctx.answerCbQuery('❌ Помилка: не вдалося отримати ID повідомлення.');
                return;
            }
            const feedbackId = parseInt(match[1]);
            await (0, models_1.updateFeedbackStatus)(feedbackId, 'read');
            const message = ctx.callbackQuery?.message;
            if (message && 'text' in message) {
                try {
                    const escapeMarkdown = (text) => {
                        return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
                    };
                    const safeText = escapeMarkdown(message.text.replace('🔔 НОВЕ', '✅ Прочитано'));
                    await ctx.editMessageText(safeText, { parse_mode: 'Markdown' });
                }
                catch (editError) {
                    logger_1.logger.debug('Could not edit message, sending new one');
                }
            }
            await ctx.answerCbQuery('✅ Позначено прочитаним!');
        })().catch((error) => {
            logger_1.logger.error('Error marking feedback as read', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
            ctx.answerCbQuery('❌ Помилка при оновленні статусу');
        });
        return;
    });
    bot.action('view_feedback_history', async (ctx) => {
        (async () => {
            await ctx.answerCbQuery('Завантаження історії повідомлень...');
            const adminCheck = await (0, models_1.isAdmin)(ctx.from.id);
            if (!adminCheck) {
                await ctx.reply('❌ У вас немає доступу до цієї функції.');
                return;
            }
            const messages = await (0, models_1.getAllFeedbackMessages)();
            logger_1.logger.info('Feedback history loaded', { count: messages.length });
            if (messages.length === 0) {
                await ctx.reply('📭 <b>Історія порожня</b>\n\n' + "Ще немає жодного повідомлення зворотного зв'язку.", { parse_mode: 'Markdown' });
                return;
            }
            await ctx.reply("📜 <b>Історія повідомлень зворотного зв'язку</b>\n\n" +
                `Всього повідомлень: ${messages.length}\n` +
                `Нових: ${messages.filter((m) => m.status === 'pending').length}\n` +
                `Прочитаних: ${messages.filter((m) => m.status === 'read').length}\n` +
                `З відповіддю: ${messages.filter((m) => m.status === 'replied').length}`, { parse_mode: 'Markdown' });
            for (const msg of messages) {
                try {
                    if (!msg.message || msg.message.trim() === '') {
                        continue;
                    }
                    const statusEmoji = msg.status === 'pending'
                        ? '🔔 НОВЕ'
                        : msg.status === 'read'
                            ? '✅ Прочитано'
                            : '💬 Відповіли';
                    const safeName = escapeHtml(msg.user_name || 'Користувач');
                    const safeUsername = msg.user_username ? escapeHtml(msg.user_username) : '';
                    const safeMessage = escapeHtml(msg.message);
                    const safeCreatedAt = escapeHtml(new Date(msg.created_at).toLocaleString('uk-UA'));
                    const safeReadAt = msg.read_at
                        ? escapeHtml(new Date(msg.read_at).toLocaleString('uk-UA'))
                        : '';
                    let feedbackText = `📞 <b>Повідомлення #${msg.id}</b> ${statusEmoji}\n\n`;
                    feedbackText += `👤 Від: ${safeName}\n`;
                    feedbackText += `🆔 User ID: <code>${msg.user_id}</code>\n`;
                    if (msg.user_username) {
                        feedbackText += `📱 Username: @${safeUsername}\n`;
                    }
                    feedbackText += `\n💬 <b>Повідомлення:</b>\n"${safeMessage}"\n\n`;
                    feedbackText += `📅 Дата: ${safeCreatedAt}`;
                    if (msg.read_at) {
                        feedbackText += `\n👁️ Прочитано: ${safeReadAt}`;
                    }
                    await ctx.reply(feedbackText, {
                        parse_mode: 'HTML',
                        reply_markup: (0, adminKeyboards_1.getFeedbackActionKeyboard)(msg.id, msg.user_id),
                    });
                    await new Promise((resolve) => setTimeout(resolve, 100));
                }
                catch (msgError) {
                    logger_1.logger.error('Error displaying feedback message', msgError instanceof Error ? msgError : new Error(String(msgError)), { feedbackId: msg.id });
                }
            }
            await ctx.reply('✅ Вся історія завантажена', {
                reply_markup: telegraf_1.Markup.inlineKeyboard([
                    [telegraf_1.Markup.button.callback('📞 Показати лише нові', 'view_feedback')],
                    [telegraf_1.Markup.button.callback('🏠 Головна', 'home')],
                ]).reply_markup,
            });
        })().catch((error) => {
            logger_1.logger.error('Error showing feedback history', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
            ctx.reply('❌ Виникла помилка при отриманні історії повідомлень.');
        });
        return;
    });
};
//# sourceMappingURL=feedback.js.map