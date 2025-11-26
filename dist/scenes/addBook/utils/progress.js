"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProgress = getProgress;
function getProgress(step, total = 9) {
    const percentage = Math.round((step / total) * 100);
    const filled = '█'.repeat(Math.round(percentage / 10));
    const empty = '░'.repeat(10 - filled.length);
    return `[${filled}${empty}] ${step}/${total} кроків`;
}
//# sourceMappingURL=progress.js.map