import { Scenes } from 'telegraf';
import { searchBooks, Book } from '../database/models';
import { 
  searchBooksByTitle, 
  searchBooksByAuthor, 
  searchBooksByGenre,
  fuzzySearchBooksByTitle,
  fuzzySearchBooksByAuthor,
  enhancedSearch,
  getSearchSuggestions
} from '../database/searchFunctions';
import { getEnhancedBookKeyboard } from '../keyboards/mainKeyboards';
import { logger } from '../utils/logger';
import { BotContext } from '../types/telegraf';

const searchScene = new Scenes.BaseScene('SEARCH_SCENE');

searchScene.enter(async (ctx) => {
  const { Markup } = await import('telegraf');
  await ctx.reply(
    '🔍 *Розширений пошук книг*\n\n' +
    'Оберіть тип пошуку або введіть запит:',
    { 
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard([
        [
          { text: '📖 За назвою', callback_data: 'search_by_title' },
          { text: '👤 За автором', callback_data: 'search_by_author' }
        ],
        [
          { text: '📚 За жанром', callback_data: 'search_by_genre' },
          { text: '🔍 Загальний пошук', callback_data: 'search_general' }
        ],
        [
          { text: '🤖 Розумний пошук (AI)', callback_data: 'search_ai' }
        ],
        [{ text: '⬅️ Назад', callback_data: 'search_back' }]
      ]).reply_markup
    }
  );
});

// Обробники фільтрів
searchScene.action('search_by_title', async (ctx: BotContext) => {
  await ctx.answerCbQuery();
  (ctx.scene as any).state.searchType = 'title';
  await ctx.editMessageText(
    '📖 *Пошук за назвою*\n\n' +
    'Введіть назву книги:\n\n' +
    '💡 *Приклад:* Кобзар',
    { parse_mode: 'Markdown' }
  );
});

searchScene.action('search_by_author', async (ctx: BotContext) => {
  await ctx.answerCbQuery();
  (ctx.scene as any).state.searchType = 'author';
  await ctx.editMessageText(
    '👤 *Пошук за автором*\n\n' +
    'Введіть ім\'я автора:\n\n' +
    '💡 *Приклад:* Шевченко',
    { parse_mode: 'Markdown' }
  );
});

searchScene.action('search_by_genre', async (ctx: BotContext) => {
  await ctx.answerCbQuery();
  (ctx.scene as any).state.searchType = 'genre';
  await ctx.editMessageText(
    '📚 *Пошук за жанром*\n\n' +
    'Введіть жанр:\n\n' +
    '💡 *Приклад:* Історична',
    { parse_mode: 'Markdown' }
  );
});

searchScene.action('search_general', async (ctx: BotContext) => {
  await ctx.answerCbQuery();
  (ctx.scene as any).state.searchType = 'general';
  await ctx.editMessageText(
    '🔍 *Розумний пошук*\n\n' +
    'Введіть будь-який запит (назва, автор, жанр):\n\n' +
    '✨ *Можливості:*\n' +
    '• Пошук з помилками: "Кобзарь" → "Кобзар"\n' +
    '• Синоніми: "Sci-Fi" → "Фантастика"\n' +
    '• Автодоповнення при введенні\n\n' +
    '💡 Пошук буде виконано по всіх полях',
    { parse_mode: 'Markdown' }
  );
});

searchScene.action('search_back', async (ctx: BotContext) => {
  await ctx.answerCbQuery();
  await ctx.scene?.leave();
  const { Markup } = await import('telegraf');
  const { getMainMenuKeyboard } = await import('../keyboards/mainKeyboards');
  await ctx.reply('👋 Повертаємось до головного меню', {
    reply_markup: getMainMenuKeyboard()
  });
});

searchScene.on('text', async (ctx: BotContext) => {
  // Валідація типу повідомлення
  if (!ctx.message || !('text' in ctx.message)) {
    await ctx.reply('❌ Будь ласка, надішліть текст для пошуку.');
    return ctx.scene?.leave();
  }
  
  const searchTerm = ctx.message.text.trim();
  const searchType = (ctx.scene as any).state?.searchType || 'general';
  
  // Перевірка на кнопку "Назад"
  if (searchTerm === '⬅️ Назад до меню') {
    const { getMainMenuKeyboard } = await import('../keyboards/mainKeyboards');
    await ctx.reply('👋 Повертаємось до головного меню', {
      reply_markup: getMainMenuKeyboard()
    });
    return ctx.scene?.leave();
  }
  
  // ✅ ВИПРАВЛЕНО #4: валідація довжини пошукового запиту з константами
  const { CONFIG } = await import('../constants');
  if (searchTerm.length < CONFIG.MIN_SEARCH_LENGTH) {
    await ctx.reply(`❌ Пошуковий запит занадто короткий. Введіть мінімум ${CONFIG.MIN_SEARCH_LENGTH} символи.`);
    return;
  }
  
  if (searchTerm.length > CONFIG.MAX_SEARCH_LENGTH) {
    await ctx.reply(
      `❌ Пошуковий запит занадто довгий. Максимум ${CONFIG.MAX_SEARCH_LENGTH} символів.\n\n` +
      'Спробуйте скоротити запит або використати ключові слова.'
    );
    return;
  }
  
  try {
    console.log('🔍 Search request:', searchTerm, 'from user:', ctx.from?.id, 'type:', searchType);
    
    // Якщо це AI пошук
    if (searchType === 'ai') {
      await ctx.reply('🤖 Аналізую ваш запит та шукаю книги...');
      
      // ✅ ВИПРАВЛЕНО #13: визначаємо userId для персоналізації
      const userId = ctx.from?.id;
      
      try {
        const { naturalLanguageSearch } = await import('../utils/aiHelper');
        const { db } = await import('../database/models');
        
        // ✅ ВИПРАВЛЕНО #2: використовуємо константу для ліміту
        const { CONFIG } = await import('../constants');
        const allBooks = await new Promise<Book[]>((resolve, reject) => {
          db.all(
            `SELECT * FROM books WHERE is_available = 1 ORDER BY rating DESC, downloads_count DESC LIMIT ${CONFIG.AI_MAX_BOOKS}`,
            [],
            (err, rows: Book[]) => {
              if (err) reject(err);
              else resolve(rows || []);
            }
          );
        });
        
        if (allBooks.length === 0) {
          await ctx.reply('📭 На жаль, в бібліотеці поки немає книг');
          return ctx.scene?.leave();
        }
        
        // Попереджаємо якщо обмежили
        if (allBooks.length === CONFIG.AI_MAX_BOOKS) {
          await ctx.reply(`⚠️ Пошук обмежено першими ${CONFIG.AI_MAX_BOOKS} найпопулярніших книг для швидкості`);
        }
        
        // ✅ ВИПРАВЛЕНО #13: AI пошук з персоналізацією
        const books = await naturalLanguageSearch(searchTerm, allBooks, userId);
        
        if (books.length === 0) {
          await ctx.reply(
            '😔 Не знайдено книг за вашим запитом.\n\n' +
            'Спробуйте:\n' +
            '• Описати інакше\n' +
            '• Використати інші ключові слова\n' +
            '• Звичайний пошук'
          );
          return ctx.scene?.leave();
        }
        
        await ctx.reply(
          `✨ *AI знайшов ${books.length} ${books.length === 1 ? 'книгу' : books.length < 5 ? 'книги' : 'книг'}*\n\n` +
          `Запит: "${searchTerm}"`,
          { parse_mode: 'Markdown' }
        );
        
        // Показуємо результати
        const { isBookSaved } = await import('../database/models');
        
        for (const book of books) {
          const isSaved = userId ? await isBookSaved(userId, book.id!) : false;
          const caption = 
            `📖 *${book.title}*\n` +
            `👤 ${book.author}\n` +
            `📚 ${book.genre}\n\n` +
            `${book.description?.substring(0, 150) || 'Немає опису'}...`;
          
          if (book.photo_file_id && book.photo_file_id !== 'default_book_cover') {
            try {
              await ctx.replyWithPhoto(book.photo_file_id, {
                caption,
                parse_mode: 'Markdown',
                reply_markup: getEnhancedBookKeyboard(book, isSaved)
              });
            } catch (error) {
              await ctx.reply(caption, {
                parse_mode: 'Markdown',
                reply_markup: getEnhancedBookKeyboard(book, isSaved)
              });
            }
          } else {
            await ctx.reply(caption, {
              parse_mode: 'Markdown',
              reply_markup: getEnhancedBookKeyboard(book, isSaved)
            });
          }
          
          // Затримка
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        logger.userAction(ctx.from?.id || 0, 'ai_search', { query: searchTerm, booksFound: books.length });
        
      } catch (error) {
        logger.error('Error in AI search', error instanceof Error ? error : new Error(String(error)));
        await ctx.reply('❌ Виникла помилка при AI пошуку. Спробуйте звичайний пошук.');
      }
      
      return ctx.scene?.leave();
    }
    
    // Розумний пошук з новою системою
    const SEARCH_LIMIT = 10;
    let searchResult: any;
    let books: any[] = [];
    let suggestions: string[] = [];
    let hasAiRecommendations = false;
    let searchTypeText = '';
    let aiMessage = '';
    
    switch (searchType) {
      case 'title':
        // Use dedicated title search for better accuracy
        books = await searchBooksByTitle(searchTerm, SEARCH_LIMIT);
        suggestions = await getSearchSuggestions(searchTerm, 3);
        searchTypeText = '📖 за назвою';
        break;
      case 'author':
        // Use dedicated author search for better accuracy
        books = await searchBooksByAuthor(searchTerm, SEARCH_LIMIT);
        suggestions = await getSearchSuggestions(searchTerm, 3);
        searchTypeText = '👤 за автором';
        break;
      case 'genre':
        books = await searchBooksByGenre(searchTerm, SEARCH_LIMIT);
        suggestions = await getSearchSuggestions(searchTerm, 3);
        searchTypeText = '📚 за жанром';
        break;
      default:
        // Enhanced search with full AI capabilities
        searchResult = await enhancedSearch(searchTerm, SEARCH_LIMIT, ctx.from?.id);
        books = searchResult.books;
        suggestions = searchResult.suggestions;
        hasAiRecommendations = searchResult.hasAiRecommendations;
        aiMessage = searchResult.aiMessage || '';
        searchTypeText = `🤖 розумний (${searchResult.searchStrategy})`;
    }
    
    console.log('📚 Search results:', books.length, 'books found');
    
    if (books.length === 0) {
      let noResultsMessage = '📭 *За вашим запитом нічого не знайдено*\n\n' +
        `Пошуковий запит: "${searchTerm}"\n\n`;
      
      if (suggestions.length > 0) {
        noResultsMessage += '💡 *Можливо, ви мали на увазі:*\n';
        suggestions.slice(0, 5).forEach((suggestion, i) => {
          noResultsMessage += `${i + 1}. ${suggestion}\n`;
        });
        noResultsMessage += '\n';
      }
      
      noResultsMessage += '🔍 *Спробуйте:*\n' +
        '• Перевірити правопис\n' +
        '• Використати менш конкретні слова\n' +
        '• Скористатися каталогом за жанрами\n' +
        '• Спробувати пошук за автором\n\n' +
        '🤖 *Розумні підказки:*\n' +
        '• "Любовний" → "Романтика"\n' +
        '• "Sci-Fi" → "Фантастика"\n' +
        '• "Детектив" → "Кримінал"\n' +
        '• "Історичний" → "Історія"';
      
      await ctx.reply(noResultsMessage, { parse_mode: 'Markdown' });
      
      // Показуємо AI рекомендації
      try {
        const aiRecommendations = await enhancedSearch('популярні книги', 3, ctx.from?.id);
        if (aiRecommendations.books.length > 0) {
          await ctx.reply(
            '🤖 *AI рекомендує популярні книги:*',
            { parse_mode: 'Markdown' }
          );
          
          for (const book of aiRecommendations.books) {
            const caption = `📖 *${book.title}*\n👤 ${book.author}\n📚 ${book.genre}\n⭐ ${book.rating || 'Немає рейтингу'}`;
            
            if (book.photo_file_id && book.photo_file_id !== 'default_book_cover') {
              try {
                await ctx.replyWithPhoto(book.photo_file_id, {
                  caption,
                  parse_mode: 'Markdown',
                  reply_markup: getEnhancedBookKeyboard(book, false)
                });
              } catch (error) {
                await ctx.reply(caption, {
                  parse_mode: 'Markdown',
                  reply_markup: getEnhancedBookKeyboard(book, false)
                });
              }
            } else {
              await ctx.reply(caption, {
                parse_mode: 'Markdown',
                reply_markup: getEnhancedBookKeyboard(book, false)
              });
            }
          }
        }
      } catch (error) {
        // ✅ ВИПРАВЛЕНО #43: logger замість console.error
        logger.error('Error getting AI recommendations', error instanceof Error ? error : new Error(String(error)));
      }
      
      return ctx.scene?.leave();
    }
    
    let resultsMessage = `🔍 *Результати пошуку ${searchTypeText}*\n\n`;
    
    if (aiMessage) {
      resultsMessage += `${aiMessage}\n\n`;
    }
    
    resultsMessage += `Знайдено: ${books.length} ${books.length === 1 ? 'книга' : books.length < 5 ? 'книги' : 'книг'}\n` +
      `Запит: "${searchTerm}"`;
    
    if (hasAiRecommendations) {
      resultsMessage += '\n\n🤖 *Включено AI-рекомендації на основі схожих книг*';
    }
    
    if (suggestions.length > 0 && books.length < 8) {
      resultsMessage += '\n\n💡 *Схожі запити:* ' + suggestions.slice(0, 4).join(', ');
    }
    
    if (searchResult && searchResult.searchStrategy) {
      const strategyNames = {
        'exact': 'точний збіг',
        'partial': 'часткове співпадіння',
        'semantic': 'семантичний пошук',
        'fuzzy': 'нечіткий пошук',
        'ai_recommendations': 'AI-рекомендації'
      };
      const strategyName = strategyNames[searchResult.searchStrategy as keyof typeof strategyNames] || searchResult.searchStrategy;
      resultsMessage += `\n\n🎯 *Стратегія:* ${strategyName}`;
    }
    
    await ctx.reply(resultsMessage, { parse_mode: 'Markdown' });
    
    const { isBookSaved } = await import('../database/models');
    const userId = ctx.from?.id;
    
    for (const book of books) {
      const isSaved = userId ? await isBookSaved(userId, book.id!) : false;
      const caption = `📖 *${book.title}*\n👤 Автор: ${book.author}\n📚 Жанр: ${book.genre}\n📝 ${book.description?.substring(0, 100) || 'Немає опису'}...`;

      if (book.photo_file_id && book.photo_file_id !== 'default_book_cover' && book.photo_file_id.length > 20) {
        try {
          await ctx.replyWithPhoto(book.photo_file_id, {
            caption,
            parse_mode: 'Markdown',
            reply_markup: getEnhancedBookKeyboard(book, isSaved)
          });
        } catch (error) {
          await ctx.reply(caption, {
            parse_mode: 'Markdown',
            reply_markup: getEnhancedBookKeyboard(book, isSaved)
          });
        }
      } else {
        await ctx.reply(caption, {
          parse_mode: 'Markdown',
          reply_markup: getEnhancedBookKeyboard(book, isSaved)
        });
      }
      
      // Невелика затримка між повідомленнями
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    if (books.length === SEARCH_LIMIT) {
      await ctx.reply(
        `ℹ️ Показано перші ${SEARCH_LIMIT} результатів.\n` +
        `Уточніть пошуковий запит для більш точних результатів.`
      );
    }
    
    logger.userAction(ctx.from?.id || 0, 'search_completed', { 
      searchTerm, 
      searchType, 
      resultsCount: books.length 
    });
    
  } catch (error) {
    // ✅ ВИПРАВЛЕНО #43: вже є logger.error нижче, видаляємо дублювання
    logger.error('Error searching books', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id, searchTerm });
    await ctx.reply('❌ Виникла помилка при пошуку книг. Спробуйте ще раз.');
  }
  
  const { getMainMenuKeyboard } = await import('../keyboards/mainKeyboards');
  await ctx.reply('🔍 Пошук завершено', {
    reply_markup: getMainMenuKeyboard()
  });
  
  return ctx.scene?.leave();
});

// Обробник AI пошуку (Завдання 33)
searchScene.action('search_ai', async (ctx: BotContext) => {
  await ctx.answerCbQuery();
  (ctx.scene as any).state.searchType = 'ai';
  await ctx.editMessageText(
    '🤖 *Розумний пошук (AI)*\n\n' +
    'Опишіть що шукаєте своїми словами:\n\n' +
    '💡 *Приклади:*\n' +
    '• "книги про кохання в Києві"\n' +
    '• "детективи з несподіваною розв\'язкою"\n' +
    '• "щось легке для відпочинку"\n' +
    '• "книги як у Толкіена"',
    { parse_mode: 'Markdown' }
  );
});



export default searchScene;