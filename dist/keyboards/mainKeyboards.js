"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBackKeyboard = exports.getEnhancedBookKeyboard = exports.getAdaptiveBookKeyboard = exports.getGenreKeyboard = exports.getAdaptiveGenreKeyboard = exports.getMainMenuKeyboard = exports.getAdaptiveMainMenuKeyboard = exports.getKeyboardConfig = exports.detectDeviceType = void 0;
const telegraf_1 = require("telegraf");
const detectDeviceType = (ctx) => {
    const botCtx = ctx;
    const savedDeviceType = botCtx?.session?.deviceType || botCtx?.state?.deviceType;
    if (savedDeviceType && ['mobile', 'tablet', 'desktop'].includes(savedDeviceType)) {
        return savedDeviceType;
    }
    return 'mobile';
};
exports.detectDeviceType = detectDeviceType;
const getKeyboardConfig = (deviceType) => {
    switch (deviceType) {
        case 'mobile':
            return {
                buttonsPerRow: 2,
                useInline: false,
                showQuickActions: true,
                buttonSize: 'large',
            };
        case 'tablet':
            return {
                buttonsPerRow: 3,
                useInline: false,
                showQuickActions: true,
                buttonSize: 'medium',
            };
        case 'desktop':
            return {
                buttonsPerRow: 4,
                useInline: true,
                showQuickActions: true,
                buttonSize: 'small',
            };
        default:
            return {
                buttonsPerRow: 2,
                useInline: false,
                showQuickActions: true,
                buttonSize: 'large',
            };
    }
};
exports.getKeyboardConfig = getKeyboardConfig;
const getAdaptiveMainMenuKeyboard = (_ctx, _withQuickActions = true) => {
    const deviceType = (0, exports.detectDeviceType)(_ctx);
    const config = (0, exports.getKeyboardConfig)(deviceType);
    const allButtons = [
        '📚 Бібліотека',
        '⭐ Топ книги',
        '🆕 Новинки',
        '❤️ Мої улюблені',
        '👤 Профіль',
        '🤖 AI Помічник',
        '🎁 Промокод',
        '⚙️ Налаштування',
        '❓ Допомога',
        "💬 Зворотній зв'язок",
    ];
    const buttons = [];
    for (let i = 0; i < allButtons.length; i += config.buttonsPerRow) {
        buttons.push(allButtons.slice(i, i + config.buttonsPerRow));
    }
    if (config.useInline) {
        const inlineButtons = buttons.map((row) => row.map((text) => telegraf_1.Markup.button.callback(text, `menu_${text.replace(/[^\w]/g, '_')}`)));
        return telegraf_1.Markup.inlineKeyboard(inlineButtons).reply_markup;
    }
    return telegraf_1.Markup.keyboard(buttons).resize().oneTime().reply_markup;
};
exports.getAdaptiveMainMenuKeyboard = getAdaptiveMainMenuKeyboard;
const getMainMenuKeyboard = () => {
    const buttons = [
        ['📖 Каталог', '🏆 Топ книги'],
        ['🆕 Новинки', '💾 Моя бібліотека'],
        ['👤 Профіль', '🤖 AI Помічник'],
        ['🎁 Отримати промокод', '⚙️ Налаштування'],
        ["📞 Зворотній зв'язок", 'ℹ️ Допомога'],
    ];
    return telegraf_1.Markup.keyboard(buttons).resize().oneTime().reply_markup;
};
exports.getMainMenuKeyboard = getMainMenuKeyboard;
const getAdaptiveGenreKeyboard = (ctx, genres) => {
    const deviceType = (0, exports.detectDeviceType)(ctx);
    const config = (0, exports.getKeyboardConfig)(deviceType);
    const buttons = [];
    for (let i = 0; i < genres.length; i += config.buttonsPerRow) {
        buttons.push(genres.slice(i, i + config.buttonsPerRow));
    }
    if (config.useInline) {
        const inlineButtons = buttons.map((row) => row.map((text) => telegraf_1.Markup.button.callback(text, `genre_${text.replace(/[^\w]/g, '_')}`)));
        return telegraf_1.Markup.inlineKeyboard(inlineButtons).reply_markup;
    }
    return telegraf_1.Markup.keyboard(buttons).resize().reply_markup;
};
exports.getAdaptiveGenreKeyboard = getAdaptiveGenreKeyboard;
const getGenreKeyboard = (genres) => {
    const keyboard = genres.map((genre, index) => [
        telegraf_1.Markup.button.callback(genre, `genre_${index}`),
    ]);
    keyboard.push([telegraf_1.Markup.button.callback('⬅️ Назад', 'catalog_books')]);
    return telegraf_1.Markup.inlineKeyboard(keyboard).reply_markup;
};
exports.getGenreKeyboard = getGenreKeyboard;
const getAdaptiveBookKeyboard = (ctx, book, isSaved = false) => {
    const deviceType = (0, exports.detectDeviceType)(ctx);
    const config = (0, exports.getKeyboardConfig)(deviceType);
    const keyboard = [];
    const formatButtons = [];
    if (book.pdf_file_id || (book.file_type === 'file' && book.file_url)) {
        const format = book.file_format || 'файл';
        const buttonText = deviceType === 'mobile' ? `📥 ${format}` : '📥 Завантажити файл';
        formatButtons.push(telegraf_1.Markup.button.callback(buttonText, `download_pdf_${book.id}`));
    }
    if (book.external_link) {
        const buttonText = deviceType === 'mobile' ? '🌐 Онлайн' : '🌐 Читати онлайн';
        formatButtons.push(telegraf_1.Markup.button.url(buttonText, book.external_link));
    }
    else if (book.file_type === 'link' && book.file_url) {
        const buttonText = deviceType === 'mobile' ? '🌐 Онлайн' : '🌐 Читати онлайн';
        formatButtons.push(telegraf_1.Markup.button.url(buttonText, book.file_url));
    }
    if (book.file_type === 'audio' || book.audio_file_id) {
        const buttonText = deviceType === 'mobile' ? '🎧 Аудіо' : '🎧 Слухати';
        formatButtons.push(telegraf_1.Markup.button.callback(buttonText, `download_audio_${book.id}`));
    }
    else if (book.audio_external_link) {
        const buttonText = deviceType === 'mobile' ? '🎧 Аудіо' : '🎧 Слухати онлайн';
        formatButtons.push(telegraf_1.Markup.button.url(buttonText, book.audio_external_link));
    }
    if (formatButtons.length > 0) {
        const buttonsPerRow = deviceType === 'mobile' ? 2 : deviceType === 'tablet' ? 3 : 4;
        for (let i = 0; i < formatButtons.length; i += buttonsPerRow) {
            keyboard.push(formatButtons.slice(i, i + buttonsPerRow));
        }
    }
    const actionButtons = [];
    if (isSaved) {
        const buttonText = deviceType === 'mobile' ? '❤️' : '❤️ Збережено';
        actionButtons.push(telegraf_1.Markup.button.callback(buttonText, `save_${book.id}`));
    }
    else {
        const buttonText = deviceType === 'mobile' ? '💾' : '💾 Зберегти';
        actionButtons.push(telegraf_1.Markup.button.callback(buttonText, `save_${book.id}`));
    }
    if (book.rating && book.rating > 0) {
        const buttonText = deviceType === 'mobile'
            ? `⭐ ${book.rating.toFixed(1)}`
            : `⭐ ${book.rating.toFixed(1)} Оцінити`;
        actionButtons.push(telegraf_1.Markup.button.callback(buttonText, `rate_${book.id}`));
    }
    else {
        const buttonText = deviceType === 'mobile' ? '⭐' : '⭐ Оцінити';
        actionButtons.push(telegraf_1.Markup.button.callback(buttonText, `rate_${book.id}`));
    }
    const buttonText1 = deviceType === 'mobile' ? '📊' : '📊 Відгуки';
    const buttonText2 = deviceType === 'mobile' ? '🔍' : '🔍 Схожі';
    actionButtons.push(telegraf_1.Markup.button.callback(buttonText1, `reviews_${book.id}`));
    actionButtons.push(telegraf_1.Markup.button.callback(buttonText2, `similar_${book.id}`));
    const actionsPerRow = deviceType === 'mobile' ? 2 : deviceType === 'tablet' ? 3 : 4;
    for (let i = 0; i < actionButtons.length; i += actionsPerRow) {
        keyboard.push(actionButtons.slice(i, i + actionsPerRow));
    }
    return telegraf_1.Markup.inlineKeyboard(keyboard).reply_markup;
};
exports.getAdaptiveBookKeyboard = getAdaptiveBookKeyboard;
const getEnhancedBookKeyboard = (book, isSaved = false) => {
    const keyboard = [];
    if (book.is_physically_available) {
        keyboard.push([telegraf_1.Markup.button.callback('📋 Замовити книгу', `order_book_${book.id}`)]);
    }
    const formatRow = [];
    if (book.file_url || book.pdf_file_id) {
        formatRow.push(telegraf_1.Markup.button.callback('📥 Завантажити файл', `download_pdf_${book.id}`));
    }
    if (book.audio_file_id) {
        formatRow.push(telegraf_1.Markup.button.callback('🎧 Слухати', `download_audio_${book.id}`));
    }
    else if (book.audio_external_link) {
        formatRow.push(telegraf_1.Markup.button.url('🎧 Слухати онлайн', book.audio_external_link));
    }
    if (book.online_link) {
        formatRow.push(telegraf_1.Markup.button.url('🌐 Читати онлайн', book.online_link));
    }
    else if (book.external_link) {
        formatRow.push(telegraf_1.Markup.button.url('🌐 Читати онлайн', book.external_link));
    }
    if (formatRow.length > 0) {
        if (formatRow.length <= 2) {
            keyboard.push(formatRow);
        }
        else {
            keyboard.push(formatRow.slice(0, 2));
            keyboard.push(formatRow.slice(2));
        }
    }
    const actionRow = [];
    if (isSaved) {
        actionRow.push(telegraf_1.Markup.button.callback('❤️ Збережено', `save_${book.id}`));
    }
    else {
        actionRow.push(telegraf_1.Markup.button.callback('💾 Зберегти', `save_${book.id}`));
    }
    if (book.rating && book.rating > 0) {
        actionRow.push(telegraf_1.Markup.button.callback(`⭐ ${book.rating.toFixed(1)} Оцінити`, `rate_${book.id}`));
    }
    else {
        actionRow.push(telegraf_1.Markup.button.callback('⭐ Оцінити', `rate_${book.id}`));
    }
    keyboard.push(actionRow);
    keyboard.push([
        telegraf_1.Markup.button.callback('📊 Відгуки', `reviews_${book.id}`),
        telegraf_1.Markup.button.callback('🔍 Схожі книги', `similar_${book.id}`),
    ]);
    return telegraf_1.Markup.inlineKeyboard(keyboard).reply_markup;
};
exports.getEnhancedBookKeyboard = getEnhancedBookKeyboard;
const getBackKeyboard = () => {
    return telegraf_1.Markup.removeKeyboard().reply_markup;
};
exports.getBackKeyboard = getBackKeyboard;
//# sourceMappingURL=mainKeyboards.js.map