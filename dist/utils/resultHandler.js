"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleResult = handleResult;
exports.withResultHandler = withResultHandler;
async function handleResult(ctx, result, errorMessage) {
    if (result.isOk()) {
        return true;
    }
    const message = errorMessage || getDefaultErrorMessage(result.error);
    try {
        await ctx.reply(`❌ ${message}`);
    }
    catch (error) {
        console.error('Failed to send error message', error);
    }
    return false;
}
function getDefaultErrorMessage(error) {
    if (error.message.includes('not found')) {
        return 'Не знайдено результатів';
    }
    if (error.message.includes('timeout')) {
        return 'Час очікування вичерпаний';
    }
    return 'Сталась помилка';
}
async function withResultHandler(ctx, operation, onSuccess, errorMessage) {
    const result = await operation();
    if (!(await handleResult(ctx, result, errorMessage))) {
        return;
    }
    const value = result.unwrap();
    await onSuccess(value);
}
//# sourceMappingURL=resultHandler.js.map