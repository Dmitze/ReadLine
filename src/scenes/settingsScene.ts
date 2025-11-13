// Scene для налаштувань користувача (Завдання 30, 31)
import { Scenes, Markup } from 'telegraf';
import { BotContext } from '../types/telegraf';
import { setUserKeyboardPreference } from '../utils/userPreferences';
import { logger } from '../utils/logger';

const settingsScene = new Scenes.BaseScene<BotContext>('SETTINGS_SCENE');

// Вхід в scene
settingsScene.enter(async (ctx) => {
  await ctx.reply(
    '⚙️ <b>Налаштування</b>\n\n' +
    'Оберіть що хочете налаштувати:',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📱 Тип клавіатури', callback_data: 'settings_keyboard' }],
          [{ text: '🔔 Сповіщення', callback_data: 'settings_notifications' }],
          [{ text: '🏠 На головну', callback_data: 'settings_exit' }]
        ]
      }
    }
  );
});

// Налаштування клавіатури
settingsScene.action('settings_keyboard', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    '📱 <b>Тип клавіатури</b>\n\n' +
    'Оберіть тип клавіатури який найкраще підходить для вашого пристрою:\n\n' +
    '📱 <b>Мобільний</b> - великі кнопки, 2 в ряд\n' +
    '📲 <b>Планшет</b> - компактніші кнопки, 3 в ряд\n' +
    '💻 <b>Десктоп</b> - inline клавіатури, 4 в ряд',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📱 Мобільний', callback_data: 'keyboard_mobile' }],
          [{ text: '📲 Планшет', callback_data: 'keyboard_tablet' }],
          [{ text: '💻 Десктоп', callback_data: 'keyboard_desktop' }],
          [{ text: '⬅️ Назад', callback_data: 'settings_back' }]
        ]
      }
    }
  );
});

// Вибір типу клавіатури
settingsScene.action(/^keyboard_(mobile|tablet|desktop)$/, async (ctx) => {
  const deviceType = ctx.match[1] as 'mobile' | 'tablet' | 'desktop';
  const userId = ctx.from?.id;
  
  if (!userId) {
    await ctx.answerCbQuery('❌ Помилка');
    return;
  }
  
  const success = setUserKeyboardPreference(userId, deviceType);
  
  if (success) {
    const deviceNames = {
      mobile: '📱 Мобільний',
      tablet: '📲 Планшет',
      desktop: '💻 Десктоп'
    };
    
    await ctx.answerCbQuery('✅ Збережено');
    await ctx.editMessageText(
      `✅ <b>Тип клавіатури змінено</b>\n\n` +
      `Обрано: ${deviceNames[deviceType]}\n\n` +
      `Зміни застосуються при наступному відкритті меню.`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '⬅️ Назад до налаштувань', callback_data: 'settings_back' }],
            [{ text: '🏠 На головну', callback_data: 'settings_exit' }]
          ]
        }
      }
    );
  } else {
    await ctx.answerCbQuery('❌ Помилка збереження');
  }
});

// Налаштування сповіщень (Завдання 31)
settingsScene.action('settings_notifications', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.answerCbQuery('❌ Помилка');
    return;
  }
  
  const { getUserNotificationSettings } = require('../utils/notifications');
  const settings = getUserNotificationSettings(userId);
  
  const frequencyNames = {
    daily: 'Щодня',
    every_4_days: 'Раз на 4 дні',
    weekly: 'Раз на тиждень',
    disabled: 'Вимкнено'
  };
  
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    '🔔 <b>Налаштування сповіщень</b>\n\n' +
    `Статус: ${settings.enabled ? '✅ Увімкнено' : '❌ Вимкнено'}\n` +
    `Частота: ${frequencyNames[settings.frequency]}\n` +
    `Час: ${settings.preferredTime || '10:00'}\n\n` +
    'Оберіть що хочете змінити:',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: settings.enabled ? '🔕 Вимкнути сповіщення' : '🔔 Увімкнути сповіщення', callback_data: 'notif_toggle' }],
          [{ text: '⏰ Змінити частоту', callback_data: 'notif_frequency' }],
          [{ text: '🕐 Змінити час', callback_data: 'notif_time' }],
          [{ text: '⬅️ Назад', callback_data: 'settings_back' }]
        ]
      }
    }
  );
});

// Увімкнути/вимкнути сповіщення
settingsScene.action('notif_toggle', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.answerCbQuery('❌ Помилка');
    return;
  }
  
  const { getUserNotificationSettings, setUserNotificationSettings } = require('../utils/notifications');
  const settings = getUserNotificationSettings(userId);
  settings.enabled = !settings.enabled;
  
  setUserNotificationSettings(settings);
  
  await ctx.answerCbQuery(settings.enabled ? '✅ Сповіщення увімкнено' : '🔕 Сповіщення вимкнено');
  
  // Показуємо оновлене меню сповіщень
  const frequencyNames = {
    daily: 'Щодня',
    every_4_days: 'Раз на 4 дні',
    weekly: 'Раз на тиждень',
    disabled: 'Вимкнено'
  };
  
  await ctx.editMessageText(
    '🔔 <b>Налаштування сповіщень</b>\n\n' +
    `Статус: ${settings.enabled ? '✅ Увімкнено' : '❌ Вимкнено'}\n` +
    `Частота: ${frequencyNames[settings.frequency]}\n` +
    `Час: ${settings.preferredTime || '10:00'}\n\n` +
    'Оберіть що хочете змінити:',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: settings.enabled ? '🔕 Вимкнути сповіщення' : '🔔 Увімкнути сповіщення', callback_data: 'notif_toggle' }],
          [{ text: '⏰ Змінити частоту', callback_data: 'notif_frequency' }],
          [{ text: '🕐 Змінити час', callback_data: 'notif_time' }],
          [{ text: '⬅️ Назад', callback_data: 'settings_back' }]
        ]
      }
    }
  );
});

// Змінити частоту сповіщень
settingsScene.action('notif_frequency', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    '⏰ <b>Частота сповіщень</b>\n\n' +
    'Як часто ви хочете отримувати нагадування?',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📅 Щодня', callback_data: 'freq_daily' }],
          [{ text: '📆 Раз на 4 дні', callback_data: 'freq_every_4_days' }],
          [{ text: '📅 Раз на тиждень', callback_data: 'freq_weekly' }],
          [{ text: '🔕 Вимкнути', callback_data: 'freq_disabled' }],
          [{ text: '⬅️ Назад', callback_data: 'settings_notifications' }]
        ]
      }
    }
  );
});

// Встановити частоту
settingsScene.action(/^freq_(daily|every_4_days|weekly|disabled)$/, async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.answerCbQuery('❌ Помилка');
    return;
  }
  
  const frequency = ctx.match[1] as 'daily' | 'every_4_days' | 'weekly' | 'disabled';
  const { getUserNotificationSettings, setUserNotificationSettings } = require('../utils/notifications');
  const settings = getUserNotificationSettings(userId);
  settings.frequency = frequency;
  
  if (frequency === 'disabled') {
    settings.enabled = false;
  }
  
  setUserNotificationSettings(settings);
  
  const frequencyNames = {
    daily: 'Щодня',
    every_4_days: 'Раз на 4 дні',
    weekly: 'Раз на тиждень',
    disabled: 'Вимкнено'
  };
  
  await ctx.answerCbQuery('✅ Збережено');
  await ctx.editMessageText(
    `✅ <b>Частота змінена</b>\n\n` +
    `Нова частота: ${frequencyNames[frequency]}`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '⬅️ Назад до сповіщень', callback_data: 'settings_notifications' }],
          [{ text: '🏠 На головну', callback_data: 'settings_exit' }]
        ]
      }
    }
  );
});

// Змінити час сповіщень (заглушка)
settingsScene.action('notif_time', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    '🕐 <b>Час сповіщень</b>\n\n' +
    'Налаштування часу буде доступне незабаром!\n\n' +
    'За замовчуванням сповіщення надсилаються о 10:00.',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '⬅️ Назад', callback_data: 'settings_notifications' }]
        ]
      }
    }
  );
});

// Повернення до меню налаштувань
settingsScene.action('settings_back', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    '⚙️ <b>Налаштування</b>\n\n' +
    'Оберіть що хочете налаштувати:',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📱 Тип клавіатури', callback_data: 'settings_keyboard' }],
          [{ text: '🔔 Сповіщення', callback_data: 'settings_notifications' }],
          [{ text: '🏠 На головну', callback_data: 'settings_exit' }]
        ]
      }
    }
  );
});

// Вихід з налаштувань
settingsScene.action('settings_exit', async (ctx) => {
  await ctx.answerCbQuery('🏠 Повернення на головну');
  await ctx.scene.leave();
  const { getMainMenuKeyboard } = await import('../keyboards/mainKeyboards');
  await ctx.reply('🏠 Ви повернулись на головну', {
    reply_markup: getMainMenuKeyboard()
  });
});

// Команда для виходу
settingsScene.command('cancel', async (ctx) => {
  await ctx.scene.leave();
  await ctx.reply('❌ Налаштування закрито');
});

export default settingsScene;
