"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDate = formatDate;
exports.formatDateTime = formatDateTime;
exports.formatDateForDB = formatDateForDB;
exports.formatRelativeTime = formatRelativeTime;
exports.formatDuration = formatDuration;
function formatDate(date) {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('uk-UA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}
function formatDateTime(date) {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('uk-UA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}
function formatDateForDB(date = new Date()) {
    return date.toISOString();
}
function formatRelativeTime(date) {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1)
        return 'щойно';
    if (diffMins < 60)
        return `${diffMins} хв тому`;
    if (diffHours < 24)
        return `${diffHours} год тому`;
    if (diffDays < 7)
        return `${diffDays} дн тому`;
    return formatDate(d);
}
function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
        return `${hours}г ${minutes}хв`;
    }
    return `${minutes}хв`;
}
//# sourceMappingURL=dateFormatter.js.map