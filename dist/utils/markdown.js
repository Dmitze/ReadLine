"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.escapeMarkdownV2 = escapeMarkdownV2;
exports.escapeMarkdown = escapeMarkdown;
exports.markdownToHtml = markdownToHtml;
exports.safeFormat = safeFormat;
exports.truncateText = truncateText;
exports.formatUserName = formatUserName;
function escapeMarkdownV2(text) {
    if (!text)
        return '';
    const specialChars = [
        '_',
        '*',
        '[',
        ']',
        '(',
        ')',
        '~',
        '`',
        '>',
        '#',
        '+',
        '-',
        '=',
        '|',
        '{',
        '}',
        '.',
        '!',
    ];
    let escaped = text;
    for (const char of specialChars) {
        escaped = escaped.replace(new RegExp(`\\${char}`, 'g'), `\\${char}`);
    }
    return escaped;
}
function escapeMarkdown(text) {
    if (!text)
        return '';
    return text
        .replace(/\*/g, '\\*')
        .replace(/_/g, '\\_')
        .replace(/\[/g, '\\[')
        .replace(/\]/g, '\\]')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)')
        .replace(/~/g, '\\~')
        .replace(/`/g, '\\`')
        .replace(/>/g, '\\>')
        .replace(/#/g, '\\#')
        .replace(/\+/g, '\\+')
        .replace(/-/g, '\\-')
        .replace(/=/g, '\\=')
        .replace(/\|/g, '\\|')
        .replace(/\{/g, '\\{')
        .replace(/\}/g, '\\}')
        .replace(/\./g, '\\.')
        .replace(/!/g, '\\!');
}
function markdownToHtml(text) {
    if (!text)
        return '';
    return (text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
        .replace(/\*(.+?)\*/g, '<i>$1</i>')
        .replace(/_(.+?)_/g, '<i>$1</i>')
        .replace(/`(.+?)`/g, '<code>$1</code>'));
}
function safeFormat(text, useHtml = true) {
    if (!text)
        return { text: '', parseMode: undefined };
    if (useHtml) {
        return {
            text: markdownToHtml(text),
            parseMode: 'HTML',
        };
    }
    else {
        return {
            text: escapeMarkdown(text),
            parseMode: 'Markdown',
        };
    }
}
function truncateText(text, maxLength = 4096) {
    if (!text || text.length <= maxLength)
        return text;
    return text.substring(0, maxLength - 3) + '...';
}
function formatUserName(firstName, lastName, username) {
    const parts = [];
    if (firstName)
        parts.push(firstName);
    if (lastName)
        parts.push(lastName);
    const fullName = parts.join(' ');
    if (fullName) {
        return username ? `${fullName} (@${username})` : fullName;
    }
    return username ? `@${username}` : 'Невідомий користувач';
}
//# sourceMappingURL=markdown.js.map