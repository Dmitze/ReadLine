/**
 * AI-рекомендації на основі історії користувача
 */

import { askAI } from './aiHelper';
import { getSavedBooks } from '../database/models';
import { getUserFavoriteGenres } from '../database/recommendationFunctions';
import { logger } from './logger';

/**
 * Отримати персональні рекомендації на основі історії користувача
 */
export const getPersonalizedRecommendations = async (userId: number): Promise<string> => {
  try {
    // Отримуємо збережені книги користувача
    const savedBooks = await getSavedBooks(userId);
    
    // Отримуємо улюблені жанри
    const favoriteGenres = await getUserFavoriteGenres(userId, 3);
    
    // Формуємо контекст для AI
    let context = '';
    
    if (favoriteGenres.length > 0) {
      context += `Улюблені жанри користувача: ${favoriteGenres.join(', ')}.\n`;
    }
    
    if (savedBooks.length > 0) {
      const bookTitles = savedBooks.slice(0, 5).map(b => `"${b.title}" (${b.author})`).join(', ');
      context += `Користувач зберіг такі книги: ${bookTitles}.\n`;
    }
    
    if (!context) {
      context = 'Користувач ще не має історії читання.';
    }
    
    const question = 
      `На основі історії користувача, порекомендуй 3-5 книг українською мовою. ` +
      `Для кожної книги вкажи:\n` +
      `📖 Назву та автора\n` +
      `💡 Чому ця книга підійде\n` +
      `🎯 Жанр\n\n` +
      `Контекст: ${context}`;
    
    const recommendations = await askAI(question);
    
    logger.info('AI recommendations generated', { userId, hasHistory: savedBooks.length > 0 });
    
    return recommendations;
    
  } catch (error) {
    logger.error('Error generating personalized recommendations', error instanceof Error ? error : new Error(String(error)), { userId });
    throw error;
  }
};

/**
 * Контекстні рекомендації на основі часу доби
 */
export const getContextualRecommendations = async (): Promise<string> => {
  const hour = new Date().getHours();
  
  let timeContext = '';
  
  if (hour >= 6 && hour < 12) {
    timeContext = 'Зараз ранок. Порекомендуй мотиваційні або легкі книги для початку дня.';
  } else if (hour >= 12 && hour < 18) {
    timeContext = 'Зараз день. Порекомендуй книги для продуктивного читання або навчання.';
  } else if (hour >= 18 && hour < 22) {
    timeContext = 'Зараз вечір. Порекомендуй художню літературу або книги для відпочинку.';
  } else {
    timeContext = 'Зараз ніч. Порекомендуй спокійні книги для читання перед сном.';
  }
  
  const question = 
    `${timeContext}\n` +
    `Дай 3-4 рекомендації українською мовою з назвою, автором та коротким поясненням.`;
  
  try {
    const recommendations = await askAI(question);
    logger.info('Contextual recommendations generated', { hour });
    return recommendations;
  } catch (error) {
    logger.error('Error generating contextual recommendations', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
};

/**
 * Рекомендації на основі настрою
 */
export const getMoodBasedRecommendations = async (mood: string): Promise<string> => {
  const moodMap: Record<string, string> = {
    'щасливий': 'веселі, позитивні книги',
    'сумний': 'книги що підіймуть настрій або допоможуть зрозуміти емоції',
    'втомлений': 'легкі, невимушені книги',
    'енергійний': 'динамічні, захоплюючі книги',
    'задумливий': 'філософські, глибокі книги',
    'романтичний': 'романтичні історії',
    'пригодницький': 'пригодницькі романи',
  };
  
  const moodDescription = moodMap[mood.toLowerCase()] || 'книги що підходять під цей настрій';
  
  const question = 
    `Користувач в настрої: ${mood}. ` +
    `Порекомендуй 3-4 ${moodDescription} українською мовою. ` +
    `Для кожної книги вкажи назву, автора та чому вона підійде.`;
  
  try {
    const recommendations = await askAI(question);
    logger.info('Mood-based recommendations generated', { mood });
    return recommendations;
  } catch (error) {
    logger.error('Error generating mood-based recommendations', error instanceof Error ? error : new Error(String(error)), { mood });
    throw error;
  }
};

/**
 * Рекомендації схожих книг
 */
export const getSimilarBookRecommendations = async (bookTitle: string, bookAuthor: string): Promise<string> => {
  const question = 
    `Користувачу сподобалась книга "${bookTitle}" автора ${bookAuthor}. ` +
    `Порекомендуй 4-5 схожих книг українською мовою. ` +
    `Для кожної вкажи назву, автора та чому вона схожа.`;
  
  try {
    const recommendations = await askAI(question);
    logger.info('Similar book recommendations generated', { bookTitle, bookAuthor });
    return recommendations;
  } catch (error) {
    logger.error('Error generating similar book recommendations', error instanceof Error ? error : new Error(String(error)), { bookTitle });
    throw error;
  }
};
