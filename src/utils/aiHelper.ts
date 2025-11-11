/**
 * AI Helper Functions - заглушки для AI функцій
 * Поки що використовуємо прості алгоритми замість справжнього AI
 */

import { Book } from '../database/models';
import { logger } from './logger';

export interface UserProfile {
  favoriteGenres: string[];
  savedBooks: Book[];
  readBooks: Book[];
}

export interface AIBookRecommendation extends Book {
  aiSummary?: string;
  reason?: string;
}

/**
 * Пошук за природною мовою (заглушка)
 * ✅ ВИПРАВЛЕНО #5: додано timeout для запобігання зависанню
 * ✅ ВИПРАВЛЕНО #13: додано персоналізацію на основі історії користувача
 */
export async function naturalLanguageSearch(
  query: string, 
  allBooks: Book[],
  userId?: number
): Promise<Book[]> {
  // Обгортаємо в Promise.race з timeout
  return Promise.race([
    actualNaturalLanguageSearch(query, allBooks, userId),
    new Promise<Book[]>((_, reject) => 
      setTimeout(() => reject(new Error('AI search timeout (10s)')), 10000)
    )
  ]);
}

/**
 * Внутрішня функція пошуку
 * ✅ ВИПРАВЛЕНО #13: враховує історію користувача для персоналізації
 */
async function actualNaturalLanguageSearch(
  query: string,
  allBooks: Book[],
  userId?: number
): Promise<Book[]> {
  // Простий алгоритм пошуку за ключовими словами
  const keywords = query.toLowerCase().split(' ');
  
  // ✅ ВИПРАВЛЕНО #13: Завантажуємо історію користувача
  let userSavedBooks: Set<number> = new Set();
  let userFavoriteGenres: string[] = [];
  
  if (userId) {
    try {
      const { getSavedBooks } = await import('../database/models');
      const savedBooks = await getSavedBooks(userId);
      userSavedBooks = new Set(savedBooks.map(b => b.id));
      
      // Визначаємо улюблені жанри з історії
      const genreCounts: Record<string, number> = {};
      savedBooks.forEach(book => {
        genreCounts[book.genre] = (genreCounts[book.genre] || 0) + 1;
      });
      userFavoriteGenres = Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([genre]) => genre);
    } catch (error) {
      logger.warn('Failed to load user history for personalization', error);
    }
  }
  
  const results = allBooks.filter(book => {
    const searchText = `${book.title} ${book.author} ${book.genre} ${book.description}`.toLowerCase();
    
    return keywords.some(keyword => {
      // Пошук за жанрами
      if (keyword.includes('кохан') || keyword.includes('любов') || keyword.includes('романтик')) {
        return searchText.includes('любов') || searchText.includes('романтик') || book.genre.toLowerCase().includes('романтик');
      }
      
      if (keyword.includes('детектив') || keyword.includes('кримінал')) {
        return searchText.includes('детектив') || searchText.includes('кримінал') || book.genre.toLowerCase().includes('детектив');
      }
      
      if (keyword.includes('фантаст') || keyword.includes('sci-fi')) {
        return searchText.includes('фантаст') || book.genre.toLowerCase().includes('фантаст');
      }
      
      if (keyword.includes('історі') || keyword.includes('минул')) {
        return searchText.includes('історі') || book.genre.toLowerCase().includes('історі');
      }
      
      if (keyword.includes('жах') || keyword.includes('страшн')) {
        return searchText.includes('жах') || book.genre.toLowerCase().includes('жах');
      }
      
      // Загальний пошук
      return searchText.includes(keyword);
    });
  });
  
  // ✅ ВИПРАВЛЕНО #13: Персоналізоване сортування
  return results.sort((a, b) => {
    // Базовий score
    let scoreA = (a.rating || 0) * 10 + (a.downloads_count || 0);
    let scoreB = (b.rating || 0) * 10 + (b.downloads_count || 0);
    
    // Бонус за улюблені жанри користувача
    if (userFavoriteGenres.includes(a.genre)) scoreA += 50;
    if (userFavoriteGenres.includes(b.genre)) scoreB += 50;
    
    // Бонус за схожість з збереженими книгами (той самий автор)
    if (userId) {
      const aSimilar = allBooks.some(book => 
        userSavedBooks.has(book.id) && book.author === a.author
      );
      const bSimilar = allBooks.some(book => 
        userSavedBooks.has(book.id) && book.author === b.author
      );
      if (aSimilar) scoreA += 30;
      if (bSimilar) scoreB += 30;
    }
    
    return scoreB - scoreA;
  }).slice(0, 10);
}

/**
 * Персональна підбірка (заглушка)
 */
export async function getPersonalCollection(
  userProfile: UserProfile,
  allBooks: Book[]
): Promise<AIBookRecommendation[]> {
  // Простий алгоритм рекомендацій
  const { favoriteGenres, savedBooks } = userProfile;
  
  // ID збережених книг для виключення
  const savedBookIds = new Set(savedBooks.map(book => book.id));
  
  // Фільтруємо книги
  let candidates = allBooks.filter(book => 
    book.is_available && 
    !savedBookIds.has(book.id)
  );
  
  // Якщо є улюблені жанри - пріоритизуємо їх
  if (favoriteGenres.length > 0) {
    const genreBooks = candidates.filter(book => 
      favoriteGenres.some(genre => 
        book.genre.toLowerCase().includes(genre.toLowerCase())
      )
    );
    
    if (genreBooks.length > 0) {
      candidates = genreBooks;
    }
  }
  
  // Сортуємо за рейтингом та популярністю
  candidates.sort((a, b) => {
    const scoreA = (a.rating || 0) * 10 + (a.downloads_count || 0);
    const scoreB = (b.rating || 0) * 10 + (b.downloads_count || 0);
    return scoreB - scoreA;
  });
  
  // Беремо топ 5 та додаємо AI анотації
  const topBooks = candidates.slice(0, 5);
  const booksWithAI = await Promise.all(
    topBooks.map(async (book) => ({
      ...book,
      aiSummary: await generateAISummary(book),
      reason: await generateRecommendationReason(book, userProfile)
    }))
  );
  
  return booksWithAI;
}

/**
 * Генерація AI резюме (заглушка)
 * ✅ ВИПРАВЛЕНО #10: використовуємо константи
 */
async function generateAISummary(book: Book): Promise<string> {
  const { AI_MESSAGES } = await import('../constants');
  const summaries = AI_MESSAGES.SUMMARIES;
  
  // Додаємо персоналізовані варіанти
  const customSummaries = [
    `Захоплююча історія про ${book.genre.toLowerCase()}, яка не залишить вас байдужими.`,
    `Чудова книга в жанрі "${book.genre}" з неочікуваними поворотами сюжету.`,
    `Майстерно написана робота автора ${book.author} в стилі ${book.genre.toLowerCase()}.`,
    ...summaries
  ];
  
  return customSummaries[Math.floor(Math.random() * customSummaries.length)];
}

/**
 * Генерація причини рекомендації (заглушка)
 * ✅ ВИПРАВЛЕНО #10: використовуємо константи
 */
async function generateRecommendationReason(book: Book, userProfile: UserProfile): Promise<string> {
  const { AI_MESSAGES } = await import('../constants');
  const { favoriteGenres } = userProfile;
  
  if (favoriteGenres.includes(book.genre)) {
    return `${AI_MESSAGES.RECOMMENDATION_REASONS.FAVORITE_GENRE} "${book.genre}"`;
  }
  
  if (book.rating && book.rating > 4) {
    return `${AI_MESSAGES.RECOMMENDATION_REASONS.HIGH_RATING} (${book.rating.toFixed(1)}/5)`;
  }
  
  if (book.downloads_count && book.downloads_count > 100) {
    return `${AI_MESSAGES.RECOMMENDATION_REASONS.POPULAR} (${book.downloads_count} разів)`;
  }
  
  return `${AI_MESSAGES.RECOMMENDATION_REASONS.INTERESTING} в жанрі "${book.genre}"`;
}

/**
 * AI аналіз настрою користувача (заглушка)
 */
export async function analyzeMood(message: string): Promise<{
  mood: 'happy' | 'sad' | 'excited' | 'calm' | 'adventurous';
  confidence: number;
}> {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('весел') || lowerMessage.includes('радіс') || lowerMessage.includes('щасли')) {
    return { mood: 'happy', confidence: 0.8 };
  }
  
  if (lowerMessage.includes('сумн') || lowerMessage.includes('грустн') || lowerMessage.includes('депрес')) {
    return { mood: 'sad', confidence: 0.8 };
  }
  
  if (lowerMessage.includes('пригод') || lowerMessage.includes('екстрим') || lowerMessage.includes('активн')) {
    return { mood: 'adventurous', confidence: 0.8 };
  }
  
  if (lowerMessage.includes('спокій') || lowerMessage.includes('релакс') || lowerMessage.includes('відпочин')) {
    return { mood: 'calm', confidence: 0.8 };
  }
  
  return { mood: 'calm', confidence: 0.5 };
}

/**
 * Рекомендації на основі настрою (заглушка)
 */
export async function getMoodBasedRecommendations(
  mood: string,
  allBooks: Book[]
): Promise<Book[]> {
  const moodGenres: { [key: string]: string[] } = {
    happy: ['Комедія', 'Романтика', 'Пригоди'],
    sad: ['Драма', 'Поезія', 'Філософія'],
    excited: ['Пригоди', 'Фантастика', 'Трилер'],
    calm: ['Класична література', 'Поезія', 'Біографія'],
    adventurous: ['Пригоди', 'Фентезі', 'Детектив']
  };
  
  const preferredGenres = moodGenres[mood] || ['Класична література'];
  
  return allBooks
    .filter(book => 
      book.is_available && 
      preferredGenres.some(genre => 
        book.genre.toLowerCase().includes(genre.toLowerCase())
      )
    )
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 5);
}

/**
 * Перевірка чи AI увімкнено
 */
export function isAIEnabled(): boolean {
  const apiKey = process.env.GEMINI_API_KEY;
  return !!(apiKey && apiKey.length > 10);
}

/**
 * Перевірка якості опису (заглушка)
 */
export async function checkDescriptionQuality(description: string): Promise<{
  score: number;
  suggestions: string[];
}> {
  const score = description.length > 50 ? 80 : 40;
  const suggestions = description.length < 50 ? 
    ['Додайте більше деталей про сюжет', 'Опишіть головних персонажів'] : 
    [];
  
  return { score, suggestions };
}

/**
 * Генерація тегів (заглушка)
 */
export async function generateTags(title: string, description: string, genre: string): Promise<string[]> {
  const tags: string[] = [];
  
  // Додаємо жанр як тег
  tags.push(genre.toLowerCase());
  
  // Простий аналіз ключових слів
  const text = `${title} ${description}`.toLowerCase();
  
  if (text.includes('кохан') || text.includes('любов')) tags.push('кохання');
  if (text.includes('війн') || text.includes('бій')) tags.push('війна');
  if (text.includes('магі') || text.includes('чар')) tags.push('магія');
  if (text.includes('пригод')) tags.push('пригоди');
  if (text.includes('детектив') || text.includes('злочин')) tags.push('детектив');
  
  return [...new Set(tags)].slice(0, 5);
}

/**
 * Покращення опису (заглушка)
 */
export async function improveDescription(description: string): Promise<string> {
  // Просто повертаємо оригінальний опис
  return description;
}

/**
 * Розпізнавання інформації з обкладинки (заглушка)
 */
export async function extractBookInfoFromCover(photoFileId: string): Promise<{
  title?: string;
  author?: string;
  genre?: string;
  confidence?: 'high' | 'medium' | 'low';
}> {
  // Заглушка - повертаємо порожній результат
  return {
    confidence: 'low'
  };
}

/**
 * Визначення жанру з опису (заглушка)
 */
export async function detectGenreFromDescription(description: string): Promise<string | null> {
  // Простий аналіз ключових слів
  const text = description.toLowerCase();
  
  if (text.includes('кохан') || text.includes('любов') || text.includes('романтик')) {
    return 'Любовний роман';
  }
  
  if (text.includes('детектив') || text.includes('злочин') || text.includes('вбивств')) {
    return 'Детектив';
  }
  
  if (text.includes('фантаст') || text.includes('космос') || text.includes('майбутн')) {
    return 'Фантастика';
  }
  
  if (text.includes('жах') || text.includes('страшн') || text.includes('вампір')) {
    return 'Жахи';
  }
  
  if (text.includes('історі') || text.includes('минул') || text.includes('війн')) {
    return 'Історична';
  }
  
  return null;
}

/**
 * Генерація тегів з опису (заглушка)
 */
export async function generateTagsFromDescription(description: string, title: string = '', genre: string = ''): Promise<string[]> {
  return generateTags(title, description, genre);
}

// ✅ ВИПРАВЛЕНО #47: rate limiting для AI
const aiRequestTimestamps: number[] = [];
const AI_RATE_LIMIT = 10; // запитів
const AI_RATE_WINDOW = 60000; // за хвилину

function checkAiRateLimit(): boolean {
  const now = Date.now();
  // Видаляємо старі timestamps
  while (aiRequestTimestamps.length > 0 && aiRequestTimestamps[0] < now - AI_RATE_WINDOW) {
    aiRequestTimestamps.shift();
  }
  
  if (aiRequestTimestamps.length >= AI_RATE_LIMIT) {
    return false;
  }
  
  aiRequestTimestamps.push(now);
  return true;
}

/**
 * AI чат-бот з Gemini API
 * ✅ ВИПРАВЛЕНО #47: додано rate limiting
 */
export async function askAI(question: string): Promise<string> {
  // Перевірка rate limit
  if (!checkAiRateLimit()) {
    throw new Error('Занадто багато запитів до AI. Спробуйте через хвилину.');
  }
  
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY не налаштований');
  }
  
  try {
    // ✅ ВИПРАВЛЕНО #49: винесено в змінну оточення
    const apiBaseUrl = process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta';
    const url = `${apiBaseUrl}/models/${model}:generateContent?key=${apiKey}`;
    
    // ✅ ВИПРАВЛЕНО #58: timeout для network requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Ти - помічник бібліотеки ReadLine. Відповідай українською мовою коротко та корисно на питання про книги, літературу та читання. Можеш використовувати свої знання про світову літературу. Питання: ${question}`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
        }
      })
    });

    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Gemini API error response', new Error(errorText));
      throw new Error(`Gemini API помилка: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // ✅ ВИПРАВЛЕНО #14: proper error handling з перевіркою на кожному рівні
    if (!data) {
      throw new Error('Порожня відповідь від Gemini API');
    }
    
    if (!data.candidates || !Array.isArray(data.candidates) || data.candidates.length === 0) {
      throw new Error('Відсутні candidates у відповіді Gemini API');
    }
    
    const candidate = data.candidates[0];
    if (!candidate || !candidate.content) {
      throw new Error('Відсутній content у candidate');
    }
    
    if (!candidate.content.parts || !Array.isArray(candidate.content.parts) || candidate.content.parts.length === 0) {
      throw new Error('Відсутні parts у content');
    }
    
    const text = candidate.content.parts[0]?.text;
    if (!text || typeof text !== 'string') {
      throw new Error('Відсутній text у parts');
    }
    
    return text;
    
  } catch (error) {
    // ✅ ВИПРАВЛЕНО #43: logger замість console.error
    logger.error('Gemini API error', error instanceof Error ? error : new Error(String(error)));
    
    // ✅ ВИПРАВЛЕНО #10: використовуємо константи замість hardcoded повідомлень
    const { AI_MESSAGES } = await import('../constants');
    const lowerQuestion = question.toLowerCase();
    
    if (lowerQuestion.includes('рекоменд') || lowerQuestion.includes('пораді')) {
      return AI_MESSAGES.FALLBACK_RECOMMENDATIONS[0];
    }
    
    if (lowerQuestion.includes('жанр') || lowerQuestion.includes('що читати')) {
      return AI_MESSAGES.FALLBACK_RECOMMENDATIONS[1];
    }
    
    if (lowerQuestion.includes('автор')) {
      return AI_MESSAGES.FALLBACK_RECOMMENDATIONS[2];
    }
    
    return AI_MESSAGES.FALLBACK_RECOMMENDATIONS[3];
  }
}

/**
 * Рекомендації книг від AI (заглушка)
 */
export async function getBookRecommendations(userPreferences: any): Promise<AIBookRecommendation[]> {
  // Повертаємо порожній масив - рекомендації будуть з бази даних
  return [];
}

/**
 * Підбір книг за настроєм (заглушка)
 */
export async function getMoodBasedBooks(mood: string, allBooks: Book[]): Promise<Book[]> {
  return getMoodBasedRecommendations(mood, allBooks);
}

/**
 * Інтерактивний вибір книг (заглушка)
 */
export async function interactiveBookSelection(userAnswers: any, allBooks: Book[]): Promise<Book[]> {
  // Повертаємо перші 5 книг як заглушку
  return allBooks.slice(0, 5);
}