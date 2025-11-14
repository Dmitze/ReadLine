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



// ✅ ВИПРАВЛЕНО #47: rate limiting для AI (per-user, не глобальний)
const aiRequestsByUser = new Map<number, number[]>();
const AI_RATE_LIMIT = 30; // запитів
const AI_RATE_WINDOW = 60000; // за хвилину

function checkAiRateLimitPerUser(userId: number): boolean {
  const now = Date.now();
  const userTimestamps = aiRequestsByUser.get(userId) || [];
  
  // Видаляємо старі timestamps
  const recent = userTimestamps.filter(t => t > now - AI_RATE_WINDOW);
  
  if (recent.length >= AI_RATE_LIMIT) {
    logger.warn('AI rate limit exceeded for user', { userId, count: recent.length, limit: AI_RATE_LIMIT });
    return false;
  }
  
  recent.push(now);
  aiRequestsByUser.set(userId, recent);
  return true;
}

/**
 * AI чат-бот з Gemini API
 * ✅ ВИПРАВЛЕНО #47: додано per-user rate limiting (не глобальний)
 */
export async function askAI(question: string, userId?: number): Promise<string> {
  // Перевірка rate limit для користувача
  if (userId && !checkAiRateLimitPerUser(userId)) {
    throw new Error(`Занадто багато запитів до AI. Ліміт: ${AI_RATE_LIMIT} запитів за хвилину. Спробуйте через хвилину.`);
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
            text: `Ти - помічник бібліотеки Warrior's Library. Відповідай українською мовою на будь-які питання користувача. Ти можеш:
- Рекомендувати книги (наприклад "дай топ 10 фантастичних книг")
- Розповідати про авторів (наприклад "хто такий Гоголь")
- Відповідати на загальні питання про літературу
- Давати поради щодо читання
- Обговорювати жанри та стилі

Відповідай детально та корисно. Питання користувача: ${question}`
          }]
        }],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 2000,
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
export async function getBookRecommendations(_userPreferences: any): Promise<AIBookRecommendation[]> {
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
 * Інтерактивний вибір книг - реальний AI підбір
 * Вибирає цікаві книги на основі вподобань користувача
 */
export async function interactiveBookSelection(userAnswers: any, allBooks: Book[]): Promise<Book[]> {
  const { interest, mood, format } = userAnswers;
  
  // Фільтруємо лише доступні книги
  let candidates = allBooks.filter(book => book.is_available);
  
  if (candidates.length === 0) {
    return [];
  }
  
  // 1. ФІЛЬТР за інтересами
  const interestFilters: { [key: string]: (book: Book) => boolean } = {
    interest_fiction: (book) => 
      book.genre && (
        book.genre.toLowerCase().includes('романтик') ||
        book.genre.toLowerCase().includes('драма') ||
        book.genre.toLowerCase().includes('художн') ||
        book.genre.toLowerCase().includes('любов')
      ),
    interest_nonfiction: (book) =>
      book.genre && (
        book.genre.toLowerCase().includes('біографія') ||
        book.genre.toLowerCase().includes('самовдосконален') ||
        book.genre.toLowerCase().includes('історія') ||
        book.genre.toLowerCase().includes('наука') ||
        book.genre.toLowerCase().includes('бізнес')
      ),
    interest_educational: (book) =>
      book.genre && (
        book.genre.toLowerCase().includes('навчальн') ||
        book.genre.toLowerCase().includes('психологія') ||
        book.genre.toLowerCase().includes('саморозвиток') ||
        book.genre.toLowerCase().includes('філософія')
      ),
    interest_any: () => true
  };
  
  const filterFunc = interestFilters[interest] || interestFilters.interest_any;
  candidates = candidates.filter(filterFunc);
  
  if (candidates.length === 0) {
    // Повертаємось до всіх доступних книг, якщо нічого не знайдено за жанром
    candidates = allBooks.filter(book => book.is_available);
  }
  
  // 2. ФІЛЬТР за настроєм
  const moodScores: { [key: string]: (book: Book) => number } = {
    mood_happy: (book) => {
      let score = 0;
      const genre = book.genre?.toLowerCase() || '';
      if (genre.includes('комед')) score += 20;
      if (genre.includes('романтик')) score += 15;
      if (genre.includes('пригод')) score += 10;
      if ((book.rating || 0) > 4.5) score += 10;
      return score;
    },
    mood_calm: (book) => {
      let score = 0;
      const genre = book.genre?.toLowerCase() || '';
      if (genre.includes('класич')) score += 20;
      if (genre.includes('поезія')) score += 15;
      if (genre.includes('філософ')) score += 10;
      if ((book.rating || 0) > 3.5) score += 5;
      return score;
    },
    mood_thoughtful: (book) => {
      let score = 0;
      const genre = book.genre?.toLowerCase() || '';
      if (genre.includes('філософ')) score += 20;
      if (genre.includes('психолог')) score += 15;
      if (genre.includes('драма')) score += 10;
      if ((book.rating || 0) > 4) score += 5;
      return score;
    },
    mood_energetic: (book) => {
      let score = 0;
      const genre = book.genre?.toLowerCase() || '';
      if (genre.includes('пригод')) score += 20;
      if (genre.includes('детектив')) score += 15;
      if (genre.includes('фантаст')) score += 10;
      if ((book.downloads_count || 0) > 50) score += 5;
      return score;
    },
    mood_any: (book) => (book.rating || 0) * 10 + (book.downloads_count || 0)
  };
  
  const scoreFunc = moodScores[mood] || moodScores.mood_any;
  
  // 3. СОРТУВАННЯ за комбінацією факторів
  candidates.sort((a, b) => {
    let scoreA = scoreFunc(a);
    let scoreB = scoreFunc(b);
    
    // Базовий рейтинг та популярність
    scoreA += (a.rating || 0) * 5;
    scoreB += (b.rating || 0) * 5;
    
    scoreA += Math.min((a.downloads_count || 0) / 10, 50);
    scoreB += Math.min((b.downloads_count || 0) / 10, 50);
    
    return scoreB - scoreA;
  });
  
  // 4. ФІЛЬТР за форматом (опціонально, якщо є інформація про файли)
  // Поки що просто рекомендуємо топ книги незалежно від формату
  
  // Беремо топ 5-7 книг
  const maxBooks = Math.min(7, candidates.length);
  return candidates.slice(0, maxBooks);
}

