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
exports.enterTitleStep = enterTitleStep;
exports.processTitleStep = processTitleStep;
const telegraf_1 = require("telegraf");
const utils_1 = require("../utils");
async function enterTitleStep(ctx) {
    (0, utils_1.logUserAction)(ctx, 'start_add_book');
    await ctx.reply(`${(0, utils_1.getProgress)(0)}\n📖 Введіть назву книги:\n\n` +
        `${utils_1.examples.title}\n\n` +
        '💡 Або натисніть /cancel для скасування', {
        reply_markup: telegraf_1.Markup.keyboard([['❌ Скасувати']]).resize().reply_markup,
    });
    return ctx.wizard.next();
}
async function processTitleStep(ctx) {
    if (ctx.message && 'text' in ctx.message && ctx.message.text === '❌ Скасувати') {
        await ctx.reply('❌ Додавання книги скасовано');
        return ctx.scene?.leave();
    }
    if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply('❌ Будь ласка, надішліть текст (назву книги).');
        return;
    }
    const title = ctx.message.text.trim();
    const { VALIDATION } = await Promise.resolve().then(() => __importStar(require('../../../constants')));
    if (title.length < VALIDATION.TITLE_MIN) {
        await ctx.reply(`❌ Назва занадто коротка. Мінімум ${VALIDATION.TITLE_MIN} символи.`);
        return;
    }
    if (title.length > VALIDATION.TITLE_MAX) {
        await ctx.reply(`❌ Назва занадто довга. Максимум ${VALIDATION.TITLE_MAX} символів.`);
        return;
    }
    const state = ctx.wizard?.state;
    state.title = title;
    (0, utils_1.autoSaveState)(state);
    (0, utils_1.logUserAction)(ctx, 'entered_title', { title });
    return ctx.wizard.next();
}
//# sourceMappingURL=title.js.map