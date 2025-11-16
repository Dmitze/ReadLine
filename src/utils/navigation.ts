/**
 * Navigation utilities - breadcrumbs, quick actions
 */

import { Markup } from 'telegraf';

export interface BreadcrumbItem {
  label: string;
  action?: string;
}

/**
 * Форматувати breadcrumbs для відображення
 */
export function formatBreadcrumbs(items: BreadcrumbItem[]): string {
  return items.map((item) => item.label).join(' > ');
}

/**
 * Створити клавіатуру з кнопками навігації
 */
export function createNavigationKeyboard(options: {
  showHome?: boolean;
  showBack?: boolean;
  backAction?: string;
  additionalButtons?: any[][];
}) {
  const { showHome = true, showBack = true, backAction = 'back', additionalButtons = [] } = options;

  const keyboard: any[][] = [...additionalButtons];

  // Додаємо кнопки навігації в останній рядок
  const navRow: any[] = [];

  if (showBack) {
    navRow.push(Markup.button.callback('⬅️ Назад', backAction));
  }

  if (showHome) {
    navRow.push(Markup.button.callback('🏠 На головну', 'home'));
  }

  if (navRow.length > 0) {
    keyboard.push(navRow);
  }

  return Markup.inlineKeyboard(keyboard);
}

/**
 * Створити текст з breadcrumbs
 */
export function createBreadcrumbText(breadcrumbs: BreadcrumbItem[], content: string): string {
  const breadcrumbText = formatBreadcrumbs(breadcrumbs);
  return `📍 ${breadcrumbText}\n\n${content}`;
}

/**
 * Швидкі дії - головне меню з швидкими кнопками
 */
export function getQuickActionsKeyboard() {
  return Markup.keyboard([
    ['⚡ Швидкий пошук', '⭐ Мої улюблені'],
    ['📚 Продовжити читати', '🎲 Випадкова книга'],
    ['📖 Каталог', '🔍 Пошук'],
    ['⭐ Топ книги', '🆕 Новинки'],
    ['💾 Моя бібліотека', '👤 Профіль'],
    ['🤖 AI Помічник', 'ℹ️ Допомога'],
    ["📞 Зворотній зв'язок"],
  ]).resize().reply_markup;
}

/**
 * Стандартне головне меню (без швидких дій)
 */
export function getStandardMainMenu() {
  return Markup.keyboard([
    ['📖 Каталог', '🔍 Пошук'],
    ['⭐ Топ книги', '🆕 Новинки'],
    ['💾 Моя бібліотека', '👤 Профіль'],
    ['🤖 AI Помічник', 'ℹ️ Допомога'],
    ["📞 Зворотній зв'язок"],
  ]).resize().reply_markup;
}
