const { Scenes } = require('telegraf');
const { addRequest, getBookById } = require('../database/models');
const { formatBookCaption } = require('../utils/helpers');

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
        `📖 Книга: ${book.title}\n` +
        `👤 ПІБ: ${ctx.wizard.state.fullName}\n` +
        `🎯 Підрозділ: ${ctx.wizard.state.unit}\n` +
        `📞 Телефон: ${ctx.wizard.state.phone}`
      );
      
      await ctx.reply('Все вірно?', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '✅ Підтвердити заявку', callback_data: 'confirm_request' }],
            [{ text: '❌ Скасувати', callback_data: 'cancel_request' }]
          ]
        }
      });
    } catch (error) {
      console.error('Error getting book:', error);
      await ctx.reply('❌ Виникла помилка при отриманні інформації про книгу.');
      return ctx.scene.leave();
    }
    
    return ctx.wizard.next();
  },
  // Крок 5: Обробка підтвердження
  async (ctx) => {
    if (ctx.callbackQuery?.data === 'confirm_request') {
      try {
        const requestData = {
          userId: ctx.from.id,
          userName: ctx.from.username,
          bookId: ctx.wizard.state.bookId,
          fullName: ctx.wizard.state.fullName,
          unit: ctx.wizard.state.unit,
          phone: ctx.wizard.state.phone
        };
        
        const requestId = await addRequest(requestData);
        
        await ctx.reply('✅ Заявку успішно подано! Адміністратор зв\'яжеться з вами.', {
          reply_markup: { remove_keyboard: true }
        });
        
        // Notify admin about new request (this would be implemented in the bot)
        // await notifyAdminAboutNewRequest(ctx, ctx.wizard.state, requestId);
      } catch (error) {
        console.error('Error saving request:', error);
        await ctx.reply('❌ Виникла помилка при поданні заявки. Спробуйте ще раз.', {
          reply_markup: { remove_keyboard: true }
        });
      }
    } else {
      await ctx.reply('❌ Заявку скасовано.', {
        reply_markup: { remove_keyboard: true }
      });
    }
    return ctx.scene.leave();
  }
);

module.exports = requestBookScene;