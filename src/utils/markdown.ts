/**
 * Markdown Utilities
 * ✅ ВИПРАВЛЕНО #17: централізоване екранування Markdown
 */

/**
 * Екранує спеціальні символи Markdown V2
 */
export function escapeMarkdownV2(text: string): string {
  if (!text) return '';

  // Символи що потребують екранування в Markdown V2
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

/**
 * Екранує спеціальні символи Markdown V1 (legacy)
 */
export function escapeMarkdown(text: string): string {
  if (!text) return '';

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

/**
 * Конвертує Markdown в HTML (безпечніше для Telegram)
 * ✅ РЕКОМЕНДОВАНО: використовувати HTML замість Markdown
 */
export function markdownToHtml(text: string): string {
  if (!text) return '';

  return (
    text
      // Екрануємо HTML спецсимволи
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Конвертуємо Markdown в HTML
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>') // **bold**
      .replace(/\*(.+?)\*/g, '<i>$1</i>') // *italic*
      .replace(/_(.+?)_/g, '<i>$1</i>') // _italic_
      .replace(/`(.+?)`/g, '<code>$1</code>')
  ); // `code`
}

/**
 * Безпечно форматує текст для Telegram
 * Автоматично вибирає найкращий метод
 */
export function safeFormat(
  text: string,
  useHtml: boolean = true
): { text: string; parseMode: 'HTML' | 'Markdown' | undefined } {
  if (!text) return { text: '', parseMode: undefined };

  if (useHtml) {
    return {
      text: markdownToHtml(text),
      parseMode: 'HTML',
    };
  } else {
    return {
      text: escapeMarkdown(text),
      parseMode: 'Markdown',
    };
  }
}

/**
 * Обрізає текст до максимальної довжини
 */
export function truncateText(text: string, maxLength: number = 4096): string {
  if (!text || text.length <= maxLength) return text;

  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Форматує ім'я користувача безпечно
 */
export function formatUserName(firstName?: string, lastName?: string, username?: string): string {
  const parts: string[] = [];

  if (firstName) parts.push(firstName);
  if (lastName) parts.push(lastName);

  const fullName = parts.join(' ');

  if (fullName) {
    return username ? `${fullName} (@${username})` : fullName;
  }

  return username ? `@${username}` : 'Невідомий користувач';
}
