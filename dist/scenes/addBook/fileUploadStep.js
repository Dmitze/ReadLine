"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.showFileFormatMenu = showFileFormatMenu;
exports.handleFileFormatUpload = handleFileFormatUpload;
exports.getLoadedFormatsText = getLoadedFormatsText;
const logger_1 = require("../../utils/logger");
const utils_1 = require("./utils");
const fileValidation_1 = require("../../utils/fileValidation");
const RateLimiter_1 = require("../../middleware/RateLimiter");
const utils_2 = require("./utils");
const fileUploadLimiter = new RateLimiter_1.RateLimiter({
    windowMs: 60000,
    maxRequests: 5,
    keyGenerator: (ctx) => `file_upload:${ctx.from?.id || 'unknown'}`,
});
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
async function showFileFormatMenu(ctx, state) {
    const userId = ctx.from?.id;
    if (!userId) {
        await ctx.reply('❌ Помилка: користувач не ідентифікований');
        return;
    }
    const loadedFormats = [];
    if (state.bookFile)
        loadedFormats.push('📄 Файл');
    if (state.bookAudio)
        loadedFormats.push('🎧 Аудіо');
    if (state.bookLink)
        loadedFormats.push('🔗 Посилання');
    const loadedText = loadedFormats.length > 0
        ? `\n\n✅ Вже завантажені: ${loadedFormats.join(', ')}`
        : '';
    const canAddMore = loadedFormats.length < 3;
    const keyboard = [];
    if (canAddMore) {
        if (!state.bookFile) {
            keyboard.push([{ text: '📄 Завантажити файл (PDF, EPUB, FB2)', callback_data: `file_upload_choose_pdf_${userId}` }]);
        }
        if (!state.bookAudio) {
            keyboard.push([{ text: '🎧 Завантажити аудіокнигу (MP3, WAV)', callback_data: `file_upload_choose_audio_${userId}` }]);
        }
        if (!state.bookLink) {
            keyboard.push([{ text: '🔗 Додати посилання на книгу', callback_data: `file_upload_choose_link_${userId}` }]);
        }
    }
    keyboard.push([{ text: '✅ Готово', callback_data: `file_upload_done_${userId}` }]);
    const text = `${(0, utils_2.getProgress)(6)}\n\n📎 <b>ЗАВАНТАЖЕННЯ ФОРМАТІВ КНИГИ</b>\n\n` +
        `Оберіть формати для завантаження (можете обрати до 3):${loadedText}\n\n` +
        'Натисніть "Готово", коли закінчите.';
    await ctx.reply(text, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: keyboard },
    });
}
async function handleFileFormatUpload(ctx, state, format) {
    const userId = ctx.from?.id;
    if (!userId) {
        await ctx.reply('❌ Помилка: користувач не ідентифікований');
        return false;
    }
    const { allowed } = await fileUploadLimiter.check(ctx);
    if (!allowed) {
        await ctx.reply('❌ Занадто багато завантажень. Зачекайте хвилину та спробуйте ще раз.');
        logger_1.logger.warn('File upload rate limited', { userId, format });
        return false;
    }
    try {
        if (format === 'file') {
            if (!isMessageWithDocument(ctx)) {
                await ctx.reply('❌ Будь ласка, надішліть документ (PDF, EPUB, FB2).');
                return false;
            }
            const document = ctx.message.document;
            const validation = (0, fileValidation_1.validateDocument)(document.file_size, document.mime_type, document.file_name);
            if (!validation.isValid) {
                await ctx.reply(`❌ ${validation.error}`);
                return false;
            }
            if (document.file_size && document.file_size > fileValidation_1.MAX_FILE_SIZES.DOCUMENT) {
                await ctx.reply(`❌ Файл занадто великий (${(document.file_size / 1024 / 1024).toFixed(2)} MB). ` +
                    `Максимум ${(fileValidation_1.MAX_FILE_SIZES.DOCUMENT / 1024 / 1024).toFixed(0)} MB.`);
                return false;
            }
            state.bookFile = document.file_id;
            state.bookFileName = document.file_name || 'unknown';
            await ctx.reply(`✅ Файл завантажено: ${state.bookFileName}`);
            (0, utils_1.logUserAction)(ctx, 'uploaded_file', { fileName: state.bookFileName });
            return true;
        }
        else if (format === 'audio') {
            let audioFileId;
            let audioName = '';
            if (isMessageWithAudio(ctx)) {
                audioFileId = ctx.message.audio.file_id;
                audioName = ctx.message.audio.file_name || 'audiobook';
            }
            else if (isMessageWithVoice(ctx)) {
                audioFileId = ctx.message.voice.file_id;
                audioName = 'voice_message';
            }
            else {
                await ctx.reply('❌ Будь ласка, надішліть аудіофайл або голосове повідомлення.');
                return false;
            }
            state.bookAudio = audioFileId;
            state.bookAudioName = audioName;
            await ctx.reply(`✅ Аудіофайл завантажено: ${audioName}`);
            (0, utils_1.logUserAction)(ctx, 'uploaded_audio', { fileName: audioName });
            return true;
        }
        else if (format === 'link') {
            if (!isMessageWithText(ctx)) {
                await ctx.reply('❌ Будь ласка, надішліть текст (посилання на книгу).');
                return false;
            }
            const url = ctx.message.text.trim();
            if (!url.startsWith('http')) {
                await ctx.reply('❌ Невалідне посилання. Має починатися з http:// або https://');
                return false;
            }
            state.bookLink = url;
            await ctx.reply('✅ Посилання збережено');
            (0, utils_1.logUserAction)(ctx, 'added_link', { link: url });
            return true;
        }
        return false;
    }
    catch (error) {
        logger_1.logger.error('Error in handleFileFormatUpload', error, { userId, format });
        await ctx.reply('❌ Помилка при завантаженні. Спробуйте ще раз.');
        return false;
    }
}
function getLoadedFormatsText(state) {
    const formats = [];
    if (state.bookFile)
        formats.push(`📥 ${state.bookFileName || 'Файл'}`);
    if (state.bookAudio)
        formats.push(`🎧 ${state.bookAudioName || 'Аудіо'}`);
    if (state.bookLink)
        formats.push('🔗 Посилання');
    if (formats.length === 0) {
        return '❌ Немає завантажених форматів';
    }
    return formats.join('\n');
}
//# sourceMappingURL=fileUploadStep.js.map