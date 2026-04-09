/**
 * AI Helper Functions - заглушки для AI функцій
 * Поки що використовуємо прості алгоритми замість справжнього AI
 */

import { Book } from '../database/models';
import { logger, LogMetadata } from './logger';
import { LIMITS } from '../constants/limits';

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
  const { LIMITS } = await import('../constants/limits');

  // ✅ Подвійна захист від зависання: Promise.race + AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LIMITS.AI_SEARCH_TIMEOUT);

  try {
    return await Promise.race([
      actualNaturalLanguageSearch(query, allBooks, userId),
      new Promise<Book[]>((_, reject) => {
        controller.signal.addEventListener('abort', () =>
          reject(new Error('AI search timeout (10s)'))
        );
      }),
    ]);
  } finally {
    clearTimeout(timeoutId);
  }
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
      userSavedBooks = new Set(
        savedBooks.map((b) => b.id).filter((id): id is number => id !== undefined)
      );

      // Визначаємо улюблені жанри з історії
      const genreCounts: Record<string, number> = {};
      savedBooks.forEach((book) => {
        genreCounts[book.genre] = (genreCounts[book.genre] || 0) + 1;
      });
      userFavoriteGenres = Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([genre]) => genre);
    } catch (error) {
      logger.warn('Failed to load user history for personalization', error as LogMetadata);
    }
  }

  const results = allBooks.filter((book) => {
    const searchText =
      `${book.title} ${book.author} ${book.genre} ${book.description}`.toLowerCase();

    return keywords.some((keyword) => {
      // Пошук за жанрами
      if (keyword.includes('кохан') || keyword.includes('любов') || keyword.includes('романтик')) {
        return (
          searchText.includes('любов') ||
          searchText.includes('романтик') ||
          book.genre.toLowerCase().includes('романтик')
        );
      }

      if (keyword.includes('детектив') || keyword.includes('кримінал')) {
        return (
          searchText.includes('детектив') ||
          searchText.includes('кримінал') ||
          book.genre.toLowerCase().includes('детектив')
        );
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
  return results
    .sort((a, b) => {
      // Базовий score
      let scoreA = (a.rating || 0) * 10 + (a.downloads_count || 0);
      let scoreB = (b.rating || 0) * 10 + (b.downloads_count || 0);

      // Бонус за улюблені жанри користувача
      if (userFavoriteGenres.includes(a.genre)) scoreA += 50;
      if (userFavoriteGenres.includes(b.genre)) scoreB += 50;

      // Бонус за схожість з збереженими книгами (той самий автор)
      if (userId) {
        const aSimilar = allBooks.some(
          (book) => book.id !== undefined && userSavedBooks.has(book.id) && book.author === a.author
        );
        const bSimilar = allBooks.some(
          (book) => book.id !== undefined && userSavedBooks.has(book.id) && book.author === b.author
        );
        if (aSimilar) scoreA += 30;
        if (bSimilar) scoreB += 30;
      }

      return scoreB - scoreA;
    })
    .slice(0, LIMITS.SEARCH_RESULTS);
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
  const savedBookIds = new Set(savedBooks.map((book) => book.id));

  // Фільтруємо книги
  let candidates = allBooks.filter((book) => book.is_available && !savedBookIds.has(book.id));

  // Якщо є улюблені жанри - пріоритизуємо їх
  if (favoriteGenres.length > 0) {
    const genreBooks = candidates.filter((book) =>
      favoriteGenres.some((genre) => book.genre.toLowerCase().includes(genre.toLowerCase()))
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

  // ✅ ВИПРАВЛЕНО: Batch processing з обмеженням паралельності
  async function processBooksInBatches<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    batchSize: number = LIMITS.AI_BATCH_SIZE
  ): Promise<R[]> {
    const results: R[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(processor));
      results.push(...batchResults);
    }

    return results;
  }

  const booksWithAI = await processBooksInBatches(
    topBooks,
    async (book) => ({
      ...book,
      aiSummary: await generateAISummary(book).catch(() => 'Резюме недоступне'),
      reason: await generateRecommendationReason(book, userProfile).catch(() => 'Рекомендація недоступна'),
    }),
    2  // ✅ Ще більше обмежуємо паралельність для стабільності
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
    ...summaries,
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
export async function getMoodBasedRecommendations(mood: string, allBooks: Book[]): Promise<Book[]> {
  const moodGenres: { [key: string]: string[] } = {
    happy: ['Комедія', 'Романтика', 'Пригоди'],
    sad: ['Драма', 'Поезія', 'Філософія'],
    excited: ['Пригоди', 'Фантастика', 'Трилер'],
    calm: ['Класична література', 'Поезія', 'Біографія'],
    adventurous: ['Пригоди', 'Фентезі', 'Детектив'],
  };

  const preferredGenres = moodGenres[mood] || ['Класична література'];

  return allBooks
    .filter(
      (book) =>
        book.is_available &&
        preferredGenres.some((genre) => book.genre.toLowerCase().includes(genre.toLowerCase()))
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
  const recent = userTimestamps.filter((t) => t > now - AI_RATE_WINDOW);

  if (recent.length >= AI_RATE_LIMIT) {
    logger.warn('AI rate limit exceeded for user', {
      userId,
      count: recent.length,
      limit: AI_RATE_LIMIT,
    });
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
/**
 * Окремий запит до конкретного ключа Gemini
 */
async function callGeminiAPI(
  apiKey: string,
  model: string,
  question: string,
  timeoutMs: number
): Promise<string> {
  const apiBaseUrl =
    process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta';
  const url = `${apiBaseUrl}/models/${model}:generateContent?key=${apiKey}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Ти - помічник бібліотеки Warrior's Library. Відповідай українською мовою на будь-які питання користувача. Ти можеш:
- Рекомендувати книги (наприклад "дай топ 10 фантастичних книг")
- Розповідати про авторів (наприклад "хто такий Гоголь")
- Відповідати на загальні питання про літературу
- Давати поради щодо читання
- Обговорювати жанри та стилі

Відповідай детально та корисно. Питання користувача: ${question}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 2000,
        },
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as any;
    if (
      !data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      typeof data.candidates[0].content.parts[0].text !== 'string'
    ) {
      throw new Error('Invalid response structure from Gemini API');
    }

    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Окремий запит до Groq API (fallback для Gemini)
 */
async function callGroqAPI(
  apiKey: string,
  model: string,
  question: string,
  timeoutMs: number
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content:
              "Ти - помічник бібліотеки Warrior's Library. Відповідай українською мовою на будь-які питання користувача.",
          },
          {
            role: 'user',
            content: question,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as any;
    if (!data?.choices?.[0]?.message?.content) {
      throw new Error('Invalid response structure from Groq API');
    }

    return data.choices[0].message.content;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * AI чат-бот з підтримкою декількох ключів та автоматичним fallback
 */
export async function askAI(question: string, userId?: number): Promise<string> {
  const { LIMITS } = await import('../constants/limits');

  // Перевірка rate limit для користувача
  if (userId && !checkAiRateLimitPerUser(userId)) {
    throw new Error(
      `Занадто багато запитів до AI. Ліміт: ${AI_RATE_LIMIT} запитів за хвилину. Спробуйте через хвилину.`
    );
  }

  // Отримуємо всі доступні ключі (основний + додаткові через кому)
  const apiKeys = [
    process.env.GEMINI_API_KEY,
    ...(process.env.GEMINI_FALLBACK_KEYS ? process.env.GEMINI_FALLBACK_KEYS.split(',') : []),
  ].filter(Boolean) as string[];

  const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';

  if (apiKeys.length === 0) {
    throw new Error('Жоден GEMINI_API_KEY не налаштований');
  }

  let lastError: any = null;

  // Пробуємо кожен ключ по черзі
  for (let i = 0; i < apiKeys.length; i++) {
    const currentKey = apiKeys[i].trim();
    try {
      logger.info(`Спроба AI запиту з ключем #${i + 1}...`);
      return await callGeminiAPI(currentKey, model, question, LIMITS.AI_REQUEST_TIMEOUT);
    } catch (error: any) {
      lastError = error;
      const isLastKey = i === apiKeys.length - 1;

      // Якщо це помилка перевантаження (503) або ліміту (429), пробуємо наступний ключ
      if (error.message?.includes('503') || error.message?.includes('429')) {
        logger.warn(`Ключ #${i + 1} перевантажений, спроба наступного...`);
        continue;
      }

      // Якщо ключ заблокований (403/401), також пробуємо наступний
      if (error.message?.includes('403') || error.message?.includes('401')) {
        logger.error(`Ключ #${i + 1} недійсний або заблокований!`);
        continue;
      }

      // Якщо це тайм-аут і у нас є ще ключі - пробуємо наступний
      if (error.name === 'AbortError' || error.message?.includes('timeout')) {
        logger.warn(`Ключ #${i + 1} відхилено по тайм-ауту, спроба наступного...`);
        continue;
      }

      // Якщо помилка критична і ключ останній - виходимо
      if (isLastKey) break;
    }
  }

  // Якщо Gemini не спрацював, пробуємо Groq (якщо налаштований)
  const groqKey = process.env.GROQ_API_KEY;
  const groqModel = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

  if (groqKey) {
    try {
      logger.info('Спроба AI запиту через Groq (fallback)...');
      return await callGroqAPI(groqKey, groqModel, question, LIMITS.AI_REQUEST_TIMEOUT);
    } catch (error) {
      logger.error('Groq API error', error instanceof Error ? error : new Error(String(error)));
      lastError = error;
    }
  }

  // Якщо всі ключі не спрацювали, запускаємо покращений fallback
  const error = lastError || new Error('All AI keys failed');
  const lowerQuestion = question.toLowerCase();

  if (error.message?.includes('503')) {
    return `Зараз на серверах Google Gemini велика кількість запитів. Спробуйте, будь ласка, ще раз через кілька хвилин.`;
  }

  // Check for common personalities to avoid generic fallback if API fails
  const commonPersonalities = [
    'шевченко',
    'франко',
    'українка',
    'грушевський',
    'сковорода',
    'котляревський',
  ];

  if (commonPersonalities.some((p) => lowerQuestion.includes(p))) {
    return `Це видатна постать української культури. На жаль, зараз у мене тимчасові технічні труднощі з доступом до бази знань AI, але ви можете знайти книги про цю особу в нашому каталозі за допомогою пошуку.`;
  }

  const { AI_MESSAGES } = await import('../constants');
  return AI_MESSAGES.FALLBACK_RECOMMENDATIONS[3];
}

/**
 * User preferences for AI recommendations
 */
export interface UserPreferences {
  favoriteGenres?: string[];
  readingHistory?: number[];
  preferredAuthors?: string[];
  [key: string]: unknown;
}

/**
 * Рекомендації книг від AI (заглушка)
 */
export async function getBookRecommendations(
  _userPreferences: UserPreferences
): Promise<AIBookRecommendation[]> {
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
 * User answers for interactive selection
 */
export interface UserAnswers {
  interest?: string;
  mood?: string;
  length?: string;
  format?: string;
  [key: string]: unknown;
}

/**
 * Rerank books using AI (stub implementation)
 * Reorders books based on AI analysis of query relevance
 */
export async function rerankBooksWithAI(query: string, candidates: Book[]): Promise<Book[]> {
  if (!isAIEnabled()) {
    // Return original order if AI is disabled
    return candidates;
  }

  try {
    // Try to get AI ranking
    const rankingPrompt = `Given the search query "${query}", rank these books by relevance. Return only a JSON array of book IDs in the preferred order: [${candidates.map(b => b.id).join(',')}]`;

    const aiResponse = await askAI(rankingPrompt);

    // Try to parse AI response as JSON
    try {
      const parsed = JSON.parse(aiResponse);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Reorder candidates based on AI ranking
        const idToBook = new Map(candidates.map(book => [book.id, book]));
        const reordered: Book[] = [];

        for (const id of parsed) {
          const book = idToBook.get(id);
          if (book) {
            reordered.push(book);
            idToBook.delete(id);
          }
        }

        // Add remaining books in original order
        reordered.push(...Array.from(idToBook.values()));

        return reordered;
      }
    } catch (parseError) {
      logger.warn('Failed to parse AI ranking response', { error: parseError instanceof Error ? parseError.message : String(parseError) });
    }

    // Fallback to original order
    return candidates;
  } catch (error) {
    logger.warn('AI reranking failed, using original order', { error: error instanceof Error ? error.message : String(error) });
    return candidates;
  }
}

/**
 * Expand query with AI-generated synonyms and related terms
 */
export async function expandQueryWithAI(query: string): Promise<string[]> {
  const lowerQuery = query.toLowerCase();
  const baseTerms = lowerQuery.split(/\s+/).filter(term => term.length > 0);

  if (!isAIEnabled()) {
    // When AI is disabled, ensure the original query is always included, along with basic expansions.
    return Array.from(new Set([lowerQuery, ...expandQueryBasic(query)]));
  }

  try {
    const expansionPrompt = `Given the search query "${query}", suggest related search terms, synonyms, and alternative phrasings in Ukrainian. Return only a comma-separated list of terms.`;

    const aiResponse = await askAI(expansionPrompt);

    // Parse AI response and combine with base terms
    const aiTerms = aiResponse
      .split(',')
      .map(term => term.trim().toLowerCase())
      .filter(term => term.length > 0);

    // Use a Set to ensure uniqueness, and include the original query, tokenized terms, and AI terms.
    const termSet = new Set([lowerQuery, ...baseTerms, ...aiTerms]);
    return Array.from(termSet);
  } catch (error) {
    logger.warn('AI query expansion failed, using basic expansion', { error: error instanceof Error ? error.message : String(error) });
    // Fallback to basic expansion, ensuring the original query is included.
    return Array.from(new Set([lowerQuery, ...expandQueryBasic(query)]));
  }
}

/**
 * Basic query expansion without AI
 */
export function expandQueryBasic(query: string): string[] {
  const terms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);

  // Add basic synonyms and related terms
  const expansions: Record<string, string[]> = {
    'sci': ['наукова', 'технології', 'інновації'],
    'fi': ['фантастика', 'майбутнє', 'космос'],
    'любов': ['романтика', 'кохання', 'відносини'],
    'кохання': ['романтика', 'любов', 'відносини'],
    'романтик': ['романтика', 'любов', 'відносини'],
    'детектив': ['кримінал', 'розслідування', 'таємниця'],
    'фантастика': ['sci-fi', 'майбутнє', 'космос', 'технології'],
    'жахи': ['хорор', 'страх', 'напруга'],
    'історія': ['минуле', 'історичний', 'епоха'],
    'романтика': ['любов', 'відносини', 'кохання'],
    'пригоди': ['подорожі', 'екшн', 'ризико'],
    'класика': ['література', 'традиція', 'майстри'],
  };

  const expanded = new Set<string>(terms);

  for (const term of terms) {
    const related = expansions[term];
    if (related) {
      related.forEach(r => expanded.add(r));
    }
  }

  return Array.from(expanded);
}

// ✅ ВИПРАВЛЕНО: cleanup для запобігання memory leak
let cleanupInterval: NodeJS.Timeout | null = null;

if (typeof global !== 'undefined' && !cleanupInterval) {
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    const toDelete: number[] = [];

    aiRequestsByUser.forEach((timestamps, userId) => {
      const recent = timestamps.filter((t) => t > now - AI_RATE_WINDOW);
      if (recent.length === 0) {
        toDelete.push(userId);
      } else {
        aiRequestsByUser.set(userId, recent);
      }
    });

    toDelete.forEach(userId => aiRequestsByUser.delete(userId));

    if (toDelete.length > 0) {
      logger.debug('AI rate limiter cleanup', { removedUsers: toDelete.length });
    }
  }, 5 * 60 * 1000); // Кожні 5 хвилин

  // Cleanup on process exit
  if (typeof process !== 'undefined') {
    process.on('exit', () => {
      if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
      }
    });
  }
}

/**
 * Exported cleanup function to be used in tests
 */
export function cleanupAIHelper() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

/**
 * Інтерактивний вибір книг - реальний AI підбір
 * Вибирає цікаві книги на основі вподобань користувача
 */
export async function interactiveBookSelection(
  userAnswers: UserAnswers,
  allBooks: Book[]
): Promise<Book[]> {
  const { interest, mood, format } = userAnswers;

  // Фільтруємо лише доступні книги
  let candidates = allBooks.filter((book) => book.is_available);

  if (candidates.length === 0) {
    return [];
  }

  // 1. ФІЛЬТР за інтересами
  const interestFilters: { [key: string]: (book: Book) => boolean } = {
    interest_fiction: (book) =>
      typeof book.genre === 'string' &&
      (book.genre.toLowerCase().includes('романтик') ||
        book.genre.toLowerCase().includes('драма') ||
        book.genre.toLowerCase().includes('художн') ||
        book.genre.toLowerCase().includes('любов')),
    interest_nonfiction: (book) =>
      typeof book.genre === 'string' &&
      (book.genre.toLowerCase().includes('біографія') ||
        book.genre.toLowerCase().includes('самовдосконален') ||
        book.genre.toLowerCase().includes('історія') ||
        book.genre.toLowerCase().includes('наука') ||
        book.genre.toLowerCase().includes('бізнес')),
    interest_educational: (book) =>
      typeof book.genre === 'string' &&
      (book.genre.toLowerCase().includes('навчальн') ||
        book.genre.toLowerCase().includes('психологія') ||
        book.genre.toLowerCase().includes('саморозвиток') ||
        book.genre.toLowerCase().includes('філософія')),
    interest_any: () => true,
  };

  const filterFunc = (interest && interestFilters[interest]) || interestFilters.interest_any;
  candidates = candidates.filter(filterFunc);

  if (candidates.length === 0) {
    // Повертаємось до всіх доступних книг, якщо нічого не знайдено за жанром
    candidates = allBooks.filter((book) => book.is_available);
  }

  // 2. ФІЛЬТР за настроєм
  const moodScores: { [key: string]: (book: Book) => number } = {
    mood_happy: (book) => {
      let score = 0;
      const genre = book.genre?.toLowerCase() || '';
      if (genre.includes('комед')) score += 100;
      if (genre.includes('романтик')) score += 90;
      if (genre.includes('пригод')) score += 80;
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
    mood_any: (book) => (book.rating || 0) * 10 + (book.downloads_count || 0),
  };

  const scoreFunc = (mood && moodScores[mood]) || moodScores.mood_any;

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
