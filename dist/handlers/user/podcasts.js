"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerPodcastHandlers = registerPodcastHandlers;
const telegraf_1 = require("telegraf");
const logger_1 = require("../../utils/logger");
const podcasts_1 = require("../../database/tables/podcasts");
function registerPodcastHandlers(bot) {
    bot.action('catalog_podcasts', async (ctx) => {
        try {
            try {
                await ctx.answerCbQuery();
            }
            catch (cbError) {
                logger_1.logger.debug('Failed to answer callback query', { error: cbError instanceof Error ? cbError.message : String(cbError) });
            }
            const podcastsPerPage = 5;
            const { podcasts, total } = await (0, podcasts_1.getAllPodcastsWithPagination)(podcastsPerPage, 0);
            if (podcasts.length === 0) {
                await ctx.editMessageText('🎙️ <b>ПІДКАСТИ</b>\n\n' + '📭 Підкастів поки немає.\n\nСлідкуйте за оновленнями!', {
                    parse_mode: 'HTML',
                    reply_markup: telegraf_1.Markup.inlineKeyboard([
                        [telegraf_1.Markup.button.callback('⬅️ Назад до каталогу', 'catalog_back_main')],
                    ]).reply_markup,
                });
                return;
            }
            const totalPages = Math.ceil(total / podcastsPerPage);
            let message = '🎙️ <b>ПІДКАСТИ</b>\n\n';
            message += `Сторінка 1 з ${totalPages}\n\n`;
            const keyboard = [];
            podcasts.forEach((podcast, index) => {
                keyboard.push([
                    telegraf_1.Markup.button.callback(`${index + 1}. ${podcast.theme} ${podcast.rating ? '⭐' + podcast.rating.toFixed(1) : ''}`, `view_podcast_${podcast.id}`),
                ]);
            });
            const navButtons = [];
            if (totalPages > 1) {
                navButtons.push(telegraf_1.Markup.button.callback('Вперед ➡️', 'podcast_page_1'));
            }
            if (navButtons.length > 0) {
                keyboard.push(navButtons);
            }
            keyboard.push([telegraf_1.Markup.button.callback('⬅️ Назад до каталогу', 'catalog_back_main')]);
            await ctx.editMessageText(message, {
                parse_mode: 'HTML',
                reply_markup: telegraf_1.Markup.inlineKeyboard(keyboard).reply_markup,
            });
            logger_1.logger.userAction(ctx.from.id, 'view_podcasts_catalog');
        }
        catch (error) {
            logger_1.logger.error('Error showing podcasts catalog', error, { userId: ctx.from?.id });
            await ctx.answerCbQuery('❌ Помилка');
        }
    });
    bot.action(/view_podcast_(\d+)/, async (ctx) => {
        try {
            const match = ctx.match;
            if (!match)
                return;
            await ctx.answerCbQuery();
            const podcastId = parseInt(match[1], 10);
            const podcast = await (0, podcasts_1.getPodcastById)(podcastId);
            if (!podcast) {
                await ctx.answerCbQuery('❌ Підкаст не знайдено', { show_alert: true });
                return;
            }
            const reviews = await (0, podcasts_1.getPodcastReviews)(podcastId);
            const reviewsCount = reviews.length;
            let message = `🎙️ <b>${podcast.theme}</b>\n\n`;
            message += `📝 ${podcast.description}\n\n`;
            message += '━━━━━━━━━━━━━━━━━━━\n\n';
            if (podcast.duration) {
                const minutes = Math.floor(podcast.duration / 60);
                const seconds = podcast.duration % 60;
                message += `⏱️ Тривалість: ${minutes}:${seconds.toString().padStart(2, '0')}\n`;
            }
            message += `👂 Прослуховувань: ${podcast.listens_count || 0}\n`;
            message += `⭐ Рейтинг: ${podcast.rating ? podcast.rating.toFixed(1) : 'Немає оцінок'} (${reviewsCount} відгуків)\n\n`;
            message += '━━━━━━━━━━━━━━━━━━━';
            const keyboard = [
                [telegraf_1.Markup.button.callback('🎧 Слухати підкаст', `listen_podcast_${podcastId}`)],
                [telegraf_1.Markup.button.callback('💬 Відгуки', `podcast_reviews_${podcastId}`)],
                [telegraf_1.Markup.button.callback('⬅️ Назад до списку', 'catalog_podcasts')],
            ];
            if (podcast.cover_photo_id) {
                await ctx.deleteMessage().catch((error) => {
                    logger_1.logger.debug('Failed to delete message', {
                        error: error instanceof Error ? error.message : String(error),
                        chatId: ctx.chat?.id,
                    });
                });
                await ctx.replyWithPhoto(podcast.cover_photo_id, {
                    caption: message,
                    parse_mode: 'HTML',
                    reply_markup: telegraf_1.Markup.inlineKeyboard(keyboard).reply_markup,
                });
            }
            else {
                await ctx.editMessageText(message, {
                    parse_mode: 'HTML',
                    reply_markup: telegraf_1.Markup.inlineKeyboard(keyboard).reply_markup,
                });
            }
            logger_1.logger.userAction(ctx.from.id, 'view_podcast', { podcastId, theme: podcast.theme });
        }
        catch (error) {
            logger_1.logger.error('Error showing podcast', error, { userId: ctx.from?.id, match: ctx.match });
            await ctx.answerCbQuery('❌ Помилка');
        }
    });
    bot.action(/listen_podcast_(\d+)/, async (ctx) => {
        try {
            const match = ctx.match;
            if (!match)
                return;
            await ctx.answerCbQuery('🎧 Завантаження підкасту...');
            const podcastId = parseInt(match[1], 10);
            const userId = ctx.from?.id;
            if (!userId) {
                await ctx.answerCbQuery('❌ Помилка ідентифікації', { show_alert: true });
                return;
            }
            const podcast = await (0, podcasts_1.getPodcastById)(podcastId);
            if (!podcast) {
                await ctx.answerCbQuery('❌ Підкаст не знайдено', { show_alert: true });
                return;
            }
            await (0, podcasts_1.incrementPodcastListens)(podcastId, userId);
            if (podcast.file_type === 'audio' && podcast.file_id) {
                await ctx.replyWithAudio(podcast.file_id, {
                    caption: `🎙️ ${podcast.theme}\n\n📝 ${podcast.description}`,
                    parse_mode: 'HTML',
                });
            }
            else if (podcast.file_type === 'link' && podcast.file_url) {
                await ctx.reply(`🎙️ <b>${podcast.theme}</b>\n\n` +
                    `📝 ${podcast.description}\n\n` +
                    `🔗 <b>Посилання:</b>\n${podcast.file_url}`, { parse_mode: 'HTML' });
            }
            else if (podcast.file_type === 'archive' && podcast.file_id) {
                await ctx.replyWithDocument(podcast.file_id, {
                    caption: `🎙️ ${podcast.theme}\n\n📝 ${podcast.description}`,
                    parse_mode: 'HTML',
                });
            }
            else {
                await ctx.reply('❌ Файл підкасту недоступний.');
            }
            logger_1.logger.userAction(userId, 'listen_podcast', { podcastId, theme: podcast.theme });
        }
        catch (error) {
            logger_1.logger.error('Error sending podcast', error, { userId: ctx.from?.id, match: ctx.match });
            await ctx.reply('❌ Помилка при завантаженні підкасту');
        }
    });
    bot.action(/podcast_reviews_(\d+)/, async (ctx) => {
        try {
            const match = ctx.match;
            if (!match)
                return;
            await ctx.answerCbQuery();
            const podcastId = parseInt(match[1], 10);
            const podcast = await (0, podcasts_1.getPodcastById)(podcastId);
            const reviews = await (0, podcasts_1.getPodcastReviews)(podcastId);
            if (!podcast) {
                await ctx.answerCbQuery('❌ Підкаст не знайдено', { show_alert: true });
                return;
            }
            if (reviews.length === 0) {
                await ctx.editMessageText('💬 <b>ВІДГУКИ</b>\n\n' +
                    `🎙️ ${podcast.theme}\n\n` +
                    '📭 Відгуків поки немає. Будьте першим!', {
                    parse_mode: 'HTML',
                    reply_markup: telegraf_1.Markup.inlineKeyboard([
                        [telegraf_1.Markup.button.callback('⬅️ Назад', `view_podcast_${podcastId}`)],
                    ]).reply_markup,
                });
                return;
            }
            let message = '💬 <b>ВІДГУКИ</b>\n\n';
            message += `🎙️ ${podcast.theme}\n\n`;
            message += '━━━━━━━━━━━━━━━━━━━\n\n';
            reviews.slice(0, 5).forEach((review, index) => {
                message += `${index + 1}. ${'⭐'.repeat(review.rating)}\n`;
                if (review.comment) {
                    message += `   ${review.comment}\n`;
                }
                message += '\n';
            });
            if (reviews.length > 5) {
                message += `\n<i>Показано 5 з ${reviews.length} відгуків</i>`;
            }
            await ctx.editMessageText(message, {
                parse_mode: 'HTML',
                reply_markup: telegraf_1.Markup.inlineKeyboard([
                    [telegraf_1.Markup.button.callback('⬅️ Назад', `view_podcast_${podcastId}`)],
                ]).reply_markup,
            });
            logger_1.logger.userAction(ctx.from.id, 'view_podcast_reviews', { podcastId });
        }
        catch (error) {
            logger_1.logger.error('Error showing podcast reviews', error, { userId: ctx.from?.id });
            await ctx.answerCbQuery('❌ Помилка');
        }
    });
    bot.action(/podcast_page_(\d+)/, async (ctx) => {
        try {
            const match = ctx.match;
            if (!match)
                return;
            await ctx.answerCbQuery();
            const page = parseInt(match[1], 10);
            const podcastsPerPage = 5;
            const offset = page * podcastsPerPage;
            const { podcasts, total } = await (0, podcasts_1.getAllPodcastsWithPagination)(podcastsPerPage, offset);
            if (podcasts.length === 0) {
                await ctx.answerCbQuery('❌ Подкастів не знайдено', { show_alert: true });
                return;
            }
            const totalPages = Math.ceil(total / podcastsPerPage);
            let message = '🎙️ <b>ПІДКАСТИ</b>\n\n';
            message += `Сторінка ${page + 1} з ${totalPages}\n\n`;
            const keyboard = [];
            podcasts.forEach((podcast, index) => {
                keyboard.push([
                    telegraf_1.Markup.button.callback(`${page * podcastsPerPage + index + 1}. ${podcast.theme} ${podcast.rating ? '⭐' + podcast.rating.toFixed(1) : ''}`, `view_podcast_${podcast.id}`),
                ]);
            });
            const navButtons = [];
            if (page > 0) {
                navButtons.push(telegraf_1.Markup.button.callback('⬅️ Назад', `podcast_page_${page - 1}`));
            }
            if (page + 1 < totalPages) {
                navButtons.push(telegraf_1.Markup.button.callback('Вперед ➡️', `podcast_page_${page + 1}`));
            }
            if (navButtons.length > 0) {
                keyboard.push(navButtons);
            }
            keyboard.push([telegraf_1.Markup.button.callback('⬅️ До каталогу', 'catalog_back_main')]);
            await ctx.editMessageText(message, {
                parse_mode: 'HTML',
                reply_markup: telegraf_1.Markup.inlineKeyboard(keyboard).reply_markup,
            });
            logger_1.logger.userAction(ctx.from.id, 'view_podcast_page', { page });
        }
        catch (error) {
            logger_1.logger.error('Error showing podcast page', error, { userId: ctx.from?.id });
            await ctx.answerCbQuery('❌ Помилка');
        }
    });
}
//# sourceMappingURL=podcasts.js.map