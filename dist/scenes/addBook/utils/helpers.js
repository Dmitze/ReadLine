"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logUserAction = logUserAction;
exports.handleFileUpload = handleFileUpload;
exports.autoSaveState = autoSaveState;
const logger_1 = require("../../../utils/logger");
function logUserAction(ctx, action, data) {
    logger_1.logger.info('User action', {
        userId: ctx.from?.id,
        username: ctx.from?.username,
        action,
        step: ctx.wizard?.cursor,
        data,
        timestamp: new Date().toISOString(),
    });
}
async function handleFileUpload(ctx, operation) {
    return await operation()
        .then(() => true)
        .catch((error) => {
        if (error instanceof Error && error.message.includes('file')) {
            ctx.reply('❌ Помилка при завантаженні файлу. Спробуйте інший файл.');
            return false;
        }
        else {
            throw error;
        }
    });
}
function autoSaveState(state) {
    state.lastActivity = Date.now();
    state.autoSaveData = {
        title: state.title,
        author: state.author,
        genre: state.genre,
        description: state.description,
        photoFileId: state.photoFileId,
        bookFile: state.bookFile,
        bookAudio: state.bookAudio,
        bookLink: state.bookLink,
    };
    logger_1.logger.debug('State autosaved');
}
//# sourceMappingURL=helpers.js.map