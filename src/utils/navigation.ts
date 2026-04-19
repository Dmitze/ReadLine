import { Markup } from 'telegraf';
import { BUTTONS } from '../constants';

export interface BreadcrumbItem {
  label: string;
  action?: string;
}

export function formatBreadcrumbs(items: BreadcrumbItem[]): string {
  return items.map((item) => item.label).join(' > ');
}

export function createNavigationKeyboard(options: {
  showHome?: boolean;
  showBack?: boolean;
  backAction?: string;
  additionalButtons?: any[][];
}) {
  const { showHome = true, showBack = true, backAction = 'back', additionalButtons = [] } = options;

  const keyboard: any[][] = [...additionalButtons];

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

export function createBreadcrumbText(breadcrumbs: BreadcrumbItem[], content: string): string {
  const breadcrumbText = formatBreadcrumbs(breadcrumbs);
  return `📍 ${breadcrumbText}\n\n${content}`;
}

export function getQuickActionsKeyboard() {
  return Markup.keyboard([
    ['⚡ Швидкий пошук', '⭐ Мої улюблені'],
    ['📚 Продовжити читати', '🎲 Випадкова книга'],
    [BUTTONS.CATALOG, BUTTONS.SEARCH],
    [BUTTONS.TOP_BOOKS, BUTTONS.NEW_BOOKS],
    ['💾 Моя бібліотека', '👤 Профіль'],
    ['🤖 AI Помічник', 'ℹ️ Допомога'],
    [BUTTONS.FEEDBACK],
  ]).resize().reply_markup;
}

export function getStandardMainMenu() {
  return Markup.keyboard([
    [BUTTONS.CATALOG, BUTTONS.SEARCH],
    [BUTTONS.TOP_BOOKS, BUTTONS.NEW_BOOKS],
    [BUTTONS.MY_LIBRARY, BUTTONS.PROFILE],
    [BUTTONS.AI_ASSISTANT, BUTTONS.HELP],
    [BUTTONS.FEEDBACK],
  ]).resize().reply_markup;
}
