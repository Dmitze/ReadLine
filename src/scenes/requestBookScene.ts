import { Scenes, Markup } from 'telegraf';
import { addRequest, getBookById } from '../database/models';

const requestBookScene = new Scenes.WizardScene(
  'REQUEST_BOOK_SCENE',
  // Крок 1: ПІБ
  async (ctx) => {
    await ctx.reply('👤 Введіть ваше ПІБ (повне ім\'я):');
    return ctx.wizard.next();
  },
  // Крок 2: Підрозділ
  async (ctx) => {
    ctx.wizard.state.fullName = ctx.message.text;
    await ctx.reply('🎯 Введіть ваш підрозділ:');
    return ctx.wizard.next();
  },
  // Крок 3: Телефон
  async (ctx) => {
    ctx.wizard.state.unit = ctx.message.text;
    await ctx.reply('📞 Введіть ваш номер телефону:');
    return ctx.wizard.next();
  },
  // Крок 4: Підтвердження
  async (ctx) => {
    ctx.wizard.state.phone = ctx.message.text;
    
    try {
      const book = await getBookById(ctx.wizard.state.bookId);
      
      await ctx.reply('📋 Перевірте дані заявки:');
      await ctx.reply(
        `📖 Книга: ${book?.title}\n` +
        `👤 ПІБ: ${ctx.wizard.state.fullName}\n` +
        `🎯 Підрозділ: ${ctx.wizard.state.unit}\n` +
        `📞 Телефон: ${ctx.wizard.state.phone}`
      );
      
      await ctx.reply('Все вірно?', {
        reply_markup: Markup
          .inlineKeyboard([
            [Markup.button.callback('✅ Підтвердити заявку', 'confirm_request')],
            [Markup.button.callback('❌ Скасувати', 'cancel_request')]
          ])
          .reply_markup
      });
    } catch (error) {
      console.error('Error getting book:', error);
      await ctx.reply('❌ Виникла помилка при отриманні інформації про книгу.');
      return ctx.scene.leave();
    }
    
    return ctx.wizard.next();
  },
  // Крок 5: Обробка підтвердження
  async (ctx: any) => {
    if (ctx.callbackQuery?.data === 'confirm_request') {
      try {
        const requestData = {
          user_id: ctx.from.id,
          user_name: ctx.from.username,
          book_id: ctx.wizard.state.bookId,
          full_name: ctx.wizard.state.fullName,
          unit: ctx.wizard.state.unit,
          phone: ctx.wizard.state.phone
        };
        
        const requestId = await addRequest(requestData);
        
        await ctx.reply('✅ Заявку успішно подано! Адміністратор зв\'яжеться з вами.', {
          reply_markup: Markup.removeKeyboard().reply_markup
        });
        
        // Notify admin about new request (this would be implemented in the bot)
        // await notifyAdminAboutNewRequest(ctx, ctx.wizard.state, requestId);
      } catch (error) {
        console.error('Error saving request:', error);
        await ctx.reply('❌ Виникла помилка при поданні заявки. Спробуйте ще раз.', {
          reply_markup: Markup.removeKeyboard().reply_markup
        });
      }
    } else {
      await ctx.reply('❌ Заявку скасовано.', {
        reply_markup: Markup.removeKeyboard().reply_markup
      });
    }
    return ctx.scene.leave();
  }
);

export default requestBookScene;