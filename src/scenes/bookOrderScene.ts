import { Scenes, Markup } from 'telegraf';
import { BotContext } from '../types/telegraf';
import { getBookById } from '../database/models';
import { createBookOrder, hasUserOrderedBook } from '../database/bookOrderFunctions';
import { logger } from '../utils/logger';
import { getMainMenuKeyboard } from '../keyboards/mainKeyboards';

interface BookOrderState {
  bookId: number;
  bookTitle: string;
  bookAuthor: string;
  full_name?: string;
  callsign?: string;
  unit?: string;
  phone?: string;
  step: string;
}

const bookOrderScene = new Scenes.WizardScene<BotContext>(
  'BOOK_ORDER_SCENE',
  
  // ENTER - Привітання та інформація про книгу
  async (ctx) => {
    const state = ctx.scene.state as BookOrderState;
    const bookId = state.bookId;
    
    if (!bookId) {
      await ctx.reply('❌ Помилка: не вказано книгу');
      return ctx.scene.leave();
    }
    
    const book = await getBookById(bookId);
    if (!book) {
      await ctx.reply('❌ Книгу не знайдено');
      return ctx.scene.leave();
    }
    
    if (!(book as any).is_physically_available) {
      await ctx.reply('❌ Ця книга недоступна для замовлення - немає фізичного примірника');
      return ctx.scene.leave();
    }
    
    // Перевірити чи користувач вже замовляв цю книгу
    const alreadyOrdered = await hasUserOrderedBook(ctx.from!.id, bookId);
    if (alreadyOrdered) {
      await ctx.reply(
        '⚠️ <b>Ви вже замовляли цю книгу!</b>\n\n' +
        'Перегляньте свої замовлення в профілі або зв\'яжіться з адміністратором.',
        {
          parse_mode: 'HTML',
          reply_markup: getMainMenuKeyboard()
        }
      );
      return ctx.scene.leave();
    }
    
    state.bookTitle = book.title;
    state.bookAuthor = book.author;
    state.step = 'full_name';
    
    await ctx.reply(
      '📋 <b>ЗАМОВЛЕННЯ КНИГИ</b>\n\n' +
      `📖 Книга: ${book.title}\n` +
      `👤 Автор: ${book.author}\n\n` +
      '━━━━━━━━━━━━━━━━━━━\n\n' +
      'Для замовлення книги заповніть контактні дані.\n' +
      'Адміністратор зв\'яжеться з вами для узгодження деталей.\n\n' +
      '👤 <b>КРОК 1/4: ПІБ</b>\n\n' +
      'Введіть ваше повне ім\'я:\n' +
      '💡 <i>Приклад: Іваненко Іван Іванович</i>',
      {
        parse_mode: 'HTML',
        reply_markup: Markup.keyboard([['❌ Скасувати']]).resize().reply_markup
      }
    );
    
    return ctx.wizard.next();
  },
  
  // Крок 1-4: Обробка введення даних
  async (ctx) => {
    const state = ctx.scene.state as BookOrderState;
    
    if (!ctx.message || !('text' in ctx.message)) {
      await ctx.reply('❌ Будь ласка, надішліть текст.');
      return;
    }
    
    const text = ctx.message.text.trim();
    
    // Скасування
    if (text === '❌ Скасувати') {
      await ctx.reply('❌ Замовлення скасовано.', {
        reply_markup: getMainMenuKeyboard()
      });
      return ctx.scene.leave();
    }
    
    // Крок 1: ПІБ
    if (state.step === 'full_name') {
      if (text.length < 5) {
        await ctx.reply('❌ ПІБ занадто короткий. Мінімум 5 символів. Спробуйте ще раз:');
        return;
      }
      
      if (!/[а-яА-ЯіІїЇєЄґҐ]/.test(text)) {
        await ctx.reply('❌ Будь ласка, введіть ПІБ кирилицею. Спробуйте ще раз:');
        return;
      }
      
      state.full_name = text;
      state.step = 'callsign';
      
      await ctx.reply(
        '✅ ПІБ збережено!\n\n' +
        '🎯 <b>КРОК 2/4: ПОЗИВНИЙ</b>\n\n' +
        'Введіть ваш позивний:\n\n' +
        '💡 <i>Приклад: Воїн, Сокіл, Грім тощо</i>',
        { parse_mode: 'HTML' }
      );
      return;
    }
    
    // Крок 2: Позивний
    if (state.step === 'callsign') {
      if (text.length < 2) {
        await ctx.reply('❌ Позивний занадто короткий. Мінімум 2 символи. Спробуйте ще раз:');
        return;
      }
      
      state.callsign = text;
      state.step = 'unit';
      
      await ctx.reply(
        '✅ Позивний збережено!\n\n' +
        '🏢 <b>КРОК 3/4: ПІДРОЗДІЛ</b>\n\n' +
        'Введіть ваш підрозділ:\n\n' +
        '💡 <i>Приклад: 1-ша рота, 2-й батальйон, штаб тощо</i>',
        { parse_mode: 'HTML' }
      );
      return;
    }
    
    // Крок 3: Підрозділ
    if (state.step === 'unit') {
      if (text.length < 3) {
        await ctx.reply('❌ Назва підрозділу занадто коротка. Мінімум 3 символи. Спробуйте ще раз:');
        return;
      }
      
      state.unit = text;
      state.step = 'phone';
      
      await ctx.reply(
        '✅ Підрозділ збережено!\n\n' +
        '📞 <b>КРОК 4/4: ТЕЛЕФОН</b>\n\n' +
        'Введіть ваш номер телефону:\n\n' +
        '💡 <i>Приклад: +380501234567 або 0501234567</i>',
        { parse_mode: 'HTML' }
      );
      return;
    }
    
    // Крок 4: Телефон
    if (state.step === 'phone') {
      // Валідація телефону
      const phoneRegex = /^(\+?380|0)[0-9]{9}$/;
      const cleanPhone = text.replace(/[\s\-\(\)]/g, '');
      
      if (!phoneRegex.test(cleanPhone)) {
        await ctx.reply(
          '❌ Невірний формат телефону.\n\n' +
          'Введіть номер у форматі:\n' +
          '+380501234567 або 0501234567\n\n' +
          'Спробуйте ще раз:'
        );
        return;
      }
      
      state.phone = cleanPhone;
      state.step = 'confirm';
      
      // Показати підтвердження
      await ctx.reply(
        '✅ <b>ПЕРЕВІРТЕ ДАНІ</b>\n\n' +
        `📖 Книга: ${state.bookTitle}\n` +
        `👤 Автор: ${state.bookAuthor}\n\n` +
        '━━━━━━━━━━━━━━━━━━━\n\n' +
        '<b>ВАШІ КОНТАКТНІ ДАНІ:</b>\n\n' +
        `👤 ПІБ: ${state.full_name}\n` +
        `🎯 Позивний: ${state.callsign}\n` +
        `🏢 Підрозділ: ${state.unit}\n` +
        `📞 Телефон: ${state.phone}\n\n` +
        '━━━━━━━━━━━━━━━━━━━\n\n' +
        'Все вірно?',
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback('✅ Підтвердити', 'confirm_order')],
            [Markup.button.callback('❌ Скасувати', 'cancel_order')]
          ]).reply_markup
        }
      );
      
      return ctx.wizard.next();
    }
  },
  
  // Крок підтвердження
  async (ctx) => {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
      return;
    }
    
    const action = ctx.callbackQuery.data;
    const state = ctx.scene.state as BookOrderState;
    
    if (action === 'confirm_order') {
      try {
        await ctx.answerCbQuery('✅ Створюємо замовлення...');
        
        // Створити замовлення
        const orderId = await createBookOrder({
          book_id: state.bookId,
          user_id: ctx.from!.id,
          full_name: state.full_name!,
          callsign: state.callsign!,
          unit: state.unit!,
          phone: state.phone!
        });
        
        logger.info(`Book order created: ${orderId} by user ${ctx.from!.id} for book ${state.bookId}`);
        
        // Повідомлення користувачу
        await ctx.editMessageText(
          '✅ <b>ЗАМОВЛЕННЯ СТВОРЕНО!</b>\n\n' +
          `📋 Номер замовлення: #${orderId}\n\n` +
          `📖 Книга: ${state.bookTitle}\n` +
          `👤 Автор: ${state.bookAuthor}\n\n` +
          '━━━━━━━━━━━━━━━━━━━\n\n' +
          '📞 Адміністратор зв\'яжеться з вами найближчим часом\n' +
          'для узгодження деталей отримання книги.\n\n' +
          '💡 Ви можете переглянути свої замовлення в профілі.',
          {
            parse_mode: 'HTML'
          }
        );
        
        // Показуємо головне меню окремо
        await ctx.reply('Виберіть дію:', {
          reply_markup: getMainMenuKeyboard()
        });
        
        // Сповіщення адміну (знайти всіх адмінів)
        try {
          const { getAllAdmins } = await import('../database/models');
          const admins = await getAllAdmins();
          
          for (const admin of admins) {
            try {
              await ctx.telegram.sendMessage(
                admin.user_id,
                '🔔 <b>НОВЕ ЗАМОВЛЕННЯ КНИГИ!</b>\n\n' +
                `📋 Замовлення #${orderId}\n\n` +
                `📖 Книга: ${state.bookTitle}\n` +
                `👤 Автор: ${state.bookAuthor}\n\n` +
                '━━━━━━━━━━━━━━━━━━━\n\n' +
                '<b>КОНТАКТНІ ДАНІ:</b>\n\n' +
                `👤 ПІБ: ${state.full_name}\n` +
                `🎯 Позивний: ${state.callsign}\n` +
                `🏢 Підрозділ: ${state.unit}\n` +
                `📞 Телефон: ${state.phone}\n\n` +
                '💡 Зв\'яжіться з користувачем для узгодження деталей.',
                {
                  parse_mode: 'HTML',
                  reply_markup: Markup.inlineKeyboard([
                    [Markup.button.callback('📋 Переглянути замовлення', `admin_view_order_${orderId}`)],
                    [Markup.button.callback('📋 Всі замовлення', 'admin_orders')]
                  ]).reply_markup
                }
              );
            } catch (error) {
              logger.error(`Failed to notify admin ${admin.user_id}:`, error as Error);
            }
          }
        } catch (error) {
          logger.error('Failed to notify admins about new order:', error as Error);
        }
        
        return ctx.scene.leave();
        
      } catch (error) {
        logger.error('Error creating book order:', error as Error);
        await ctx.reply(
          '❌ Помилка при створенні замовлення.\n' +
          'Спробуйте пізніше або зв\'яжіться з адміністратором.',
          {
            reply_markup: getMainMenuKeyboard()
          }
        );
        return ctx.scene.leave();
      }
    }
    
    if (action === 'cancel_order') {
      await ctx.answerCbQuery('❌ Замовлення скасовано');
      await ctx.reply(
        '❌ Замовлення скасовано.\n\n' +
        'Ви можете замовити книгу пізніше.',
        {
          reply_markup: getMainMenuKeyboard()
        }
      );
      return ctx.scene.leave();
    }
  }
);

export default bookOrderScene;
