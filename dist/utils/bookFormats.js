"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBookFormats = getBookFormats;
exports.getFormatsDescription = getFormatsDescription;
exports.formatDuration = formatDuration;
exports.hasAnyDigitalFormat = hasAnyDigitalFormat;
function getBookFormats(book) {
    const formats = [];
    const hasPDF = !!(book.pdf_file_id || (book.file_type === 'file' && book.file_url));
    const hasLink = !!(book.external_link || (book.file_type === 'link' && book.file_url));
    const hasAudio = !!book.audio_file_id;
    if (hasPDF)
        formats.push('pdf');
    if (hasLink)
        formats.push('link');
    if (hasAudio)
        formats.push('audio');
    return {
        hasPDF,
        hasLink,
        hasAudio,
        formats,
    };
}
function getFormatsDescription(book) {
    const { hasPDF, hasLink, hasAudio } = getBookFormats(book);
    const parts = [];
    if (hasPDF)
        parts.push('📥 PDF');
    if (hasLink)
        parts.push('🔗 Онлайн');
    if (hasAudio) {
        const duration = book.audio_duration
            ? ` (${formatDuration(book.audio_duration)})`
            : '';
        parts.push(`🎧 Аудіо${duration}`);
    }
    return parts.length > 0 ? parts.join(' • ') : '📖 Тільки фізична копія';
}
function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
        return `${hours} год ${minutes} хв`;
    }
    return `${minutes} хв`;
}
function hasAnyDigitalFormat(book) {
    const { hasPDF, hasLink, hasAudio } = getBookFormats(book);
    return hasPDF || hasLink || hasAudio;
}
//# sourceMappingURL=bookFormats.js.map