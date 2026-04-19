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

export async function naturalLanguageSearch(
  query: string,
  allBooks: Book[],
  userId?: number
): Promise<Book[]> {
  const { LIMITS } = await import('../constants/limits');

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

async function actualNaturalLanguageSearch(
  query: string,
  allBooks: Book[],
  userId?: number
): Promise<Book[]> {
  const keywords = query.toLowerCase().split(' ');

  let userSavedBooks: Set<number> = new Set();
  let userFavoriteGenres: string[] = [];

  if (userId) {
    try {
      const { getSavedBooks } = await import('../database/models');
      const savedBooks = await getSavedBooks(userId);
      userSavedBooks = new Set(
        savedBooks.map((b) => b.id).filter((id): id is number => id !== undefined)
      );

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

      return searchText.includes(keyword);
    });
  });

  return results
    .sort((a, b) => {
      let scoreA = (a.rating || 0) * 10 + (a.downloads_count || 0);
      let scoreB = (b.rating || 0) * 10 + (b.downloads_count || 0);

      if (userFavoriteGenres.includes(a.genre)) scoreA += 50;
      if (userFavoriteGenres.includes(b.genre)) scoreB += 50;

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

export async function getPersonalCollection(
  userProfile: UserProfile,
  allBooks: Book[]
): Promise<AIBookRecommendation[]> {
  const { favoriteGenres, savedBooks } = userProfile;

  const savedBookIds = new Set(savedBooks.map((book) => book.id));

  let candidates = allBooks.filter((book) => book.is_available && !savedBookIds.has(book.id));

  if (favoriteGenres.length > 0) {
    const genreBooks = candidates.filter((book) =>
      favoriteGenres.some((genre) => book.genre.toLowerCase().includes(genre.toLowerCase()))
    );

    if (genreBooks.length > 0) {
      candidates = genreBooks;
    }
  }

  candidates.sort((a, b) => {
    const scoreA = (a.rating || 0) * 10 + (a.downloads_count || 0);
    const scoreB = (b.rating || 0) * 10 + (b.downloads_count || 0);
    return scoreB - scoreA;
  });

  const topBooks = candidates.slice(0, 5);

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
      reason: await generateRecommendationReason(book, userProfile).catch(
        () => 'Рекомендація недоступна'
      ),
    }),
    2
  );

  return booksWithAI;
}

async function generateAISummary(book: Book): Promise<string> {
  const { AI_MESSAGES } = await import('../constants');
  const summaries = AI_MESSAGES.SUMMARIES;

  const customSummaries = [
    `Захоплююча історія про ${book.genre.toLowerCase()}, яка не залишить вас байдужими.`,
    `Чудова книга в жанрі "${book.genre}" з неочікуваними поворотами сюжету.`,
    `Майстерно написана робота автора ${book.author} в стилі ${book.genre.toLowerCase()}.`,
    ...summaries,
  ];

  return customSummaries[Math.floor(Math.random() * customSummaries.length)];
}

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

export function isAIEnabled(): boolean {
  const apiKey = process.env.GEMINI_API_KEY;
  return !!(apiKey && apiKey.length > 10);
}

export async function detectGenreFromDescription(description: string): Promise<string | null> {
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

const aiRequestsByUser = new Map<number, number[]>();
const AI_RATE_LIMIT = 30;
const AI_RATE_WINDOW = 60000;

function checkAiRateLimitPerUser(userId: number): boolean {
  const now = Date.now();
  const userTimestamps = aiRequestsByUser.get(userId) || [];

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

async function callGeminiAPI(
  apiKey: string,
  model: string,
  question: string,
  timeoutMs: number
): Promise<{ text: string; model: string }> {
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

    return {
      text: data.candidates[0].content.parts[0].text,
      model: model,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function callGroqAPI(
  apiKey: string,
  model: string,
  question: string,
  timeoutMs: number
): Promise<{ text: string; model: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
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

    return {
      text: data.choices[0].message.content,
      model: model,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export interface AIResponse {
  text: string;
  model: string;
  provider: 'Gemini' | 'Groq' | 'Fallback';
}

export async function askAI(question: string, userId?: number): Promise<AIResponse> {
  const { LIMITS } = await import('../constants/limits');

  if (userId && !checkAiRateLimitPerUser(userId)) {
    throw new Error(
      `Занадто багато запитів до AI. Ліміт: ${AI_RATE_LIMIT} запитів за хвилину. Спробуйте через хвилину.`
    );
  }

  const apiKeys = [
    process.env.GEMINI_API_KEY,
    ...(process.env.GEMINI_FALLBACK_KEYS ? process.env.GEMINI_FALLBACK_KEYS.split(',') : []),
  ].filter(Boolean) as string[];

  const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';

  if (apiKeys.length === 0) {
    throw new Error('Жоден GEMINI_API_KEY не налаштований');
  }

  let lastError: any = null;

  for (let i = 0; i < apiKeys.length; i++) {
    const currentKey = apiKeys[i].trim();
    try {
      logger.info(`Спроба AI запиту з ключем #${i + 1}...`);
      const result = await callGeminiAPI(currentKey, model, question, LIMITS.AI_REQUEST_TIMEOUT);
      return {
        ...result,
        provider: 'Gemini',
      };
    } catch (error: any) {
      lastError = error;
      const isLastKey = i === apiKeys.length - 1;

      if (error.message?.includes('503') || error.message?.includes('429')) {
        logger.warn(`Ключ #${i + 1} перевантажений, спроба наступного...`);
        continue;
      }

      if (error.message?.includes('403') || error.message?.includes('401')) {
        logger.error(`Ключ #${i + 1} недійсний або заблокований!`);
        continue;
      }

      if (error.name === 'AbortError' || error.message?.includes('timeout')) {
        logger.warn(`Ключ #${i + 1} відхилено по тайм-ауту, спроба наступного...`);
        continue;
      }

      if (isLastKey) break;
    }
  }

  const groqKey = process.env.GROQ_API_KEY;
  const groqModel = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

  if (groqKey) {
    try {
      logger.info('Спроба AI запиту через Groq (fallback)...');
      const result = await callGroqAPI(groqKey, groqModel, question, LIMITS.AI_REQUEST_TIMEOUT);
      return {
        ...result,
        provider: 'Groq',
      };
    } catch (error) {
      logger.error('Groq API error', error instanceof Error ? error : new Error(String(error)));
      lastError = error;
    }
  }

  const error = lastError || new Error('All AI keys failed');
  const lowerQuestion = question.toLowerCase();

  let fallbackText = '';
  if (error.message?.includes('503')) {
    fallbackText = `Зараз на серверах Google Gemini велика кількість запитів. Спробуйте, будь ласка, ще раз через кілька хвилин.`;
  } else {
    const commonPersonalities = [
      'шевченко',
      'франко',
      'українка',
      'грушевський',
      'сковорода',
      'котляревський',
    ];

    if (commonPersonalities.some((p) => lowerQuestion.includes(p))) {
      fallbackText = `Це видатна постать української культури. На жаль, зараз у мене тимчасові технічні труднощі з доступом до бази знань AI, але ви можете знайти книги про цю особу в нашому каталозі за допомогою пошуку.`;
    } else {
      const { AI_MESSAGES } = await import('../constants');
      fallbackText = AI_MESSAGES.FALLBACK_RECOMMENDATIONS[3];
    }
  }

  return {
    text: fallbackText,
    model: 'Local Fallback',
    provider: 'Fallback',
  };
}

export interface UserPreferences {
  favoriteGenres?: string[];
  readingHistory?: number[];
  preferredAuthors?: string[];
  [key: string]: unknown;
}

export async function getBookRecommendations(
  _userPreferences: UserPreferences
): Promise<AIBookRecommendation[]> {
  return [];
}

export async function getMoodBasedBooks(mood: string, allBooks: Book[]): Promise<Book[]> {
  return getMoodBasedRecommendations(mood, allBooks);
}

export interface UserAnswers {
  interest?: string;
  mood?: string;
  length?: string;
  format?: string;
  [key: string]: unknown;
}

export async function rerankBooksWithAI(query: string, candidates: Book[]): Promise<Book[]> {
  if (!isAIEnabled()) {
    return candidates;
  }

  try {
    const rankingPrompt = `Given the search query "${query}", rank these books by relevance. Return only a JSON array of book IDs in the preferred order: [${candidates.map((b) => b.id).join(',')}]`;

    const aiResponse = await askAI(rankingPrompt);
    const text = aiResponse.text;

    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const idToBook = new Map(candidates.map((book) => [book.id, book]));
        const reordered: Book[] = [];

        for (const id of parsed) {
          const book = idToBook.get(id);
          if (book) {
            reordered.push(book);
            idToBook.delete(id);
          }
        }

        reordered.push(...Array.from(idToBook.values()));

        return reordered;
      }
    } catch (parseError) {
      logger.warn('Failed to parse AI ranking response', {
        error: parseError instanceof Error ? parseError.message : String(parseError),
      });
    }

    return candidates;
  } catch (error) {
    logger.warn('AI reranking failed, using original order', {
      error: error instanceof Error ? error.message : String(error),
    });
    return candidates;
  }
}

export async function expandQueryWithAI(query: string): Promise<string[]> {
  const lowerQuery = query.toLowerCase();
  const baseTerms = lowerQuery.split(/\s+/).filter((term) => term.length > 0);

  if (!isAIEnabled()) {
    return Array.from(new Set([lowerQuery, ...expandQueryBasic(query)]));
  }

  try {
    const expansionPrompt = `Given the search query "${query}", suggest related search terms, synonyms, and alternative phrasings in Ukrainian. Return only a comma-separated list of terms.`;

    const aiResponse = await askAI(expansionPrompt);
    const aiTerms = aiResponse.text
      .split(',')
      .map((term) => term.trim().toLowerCase())
      .filter((term) => term.length > 0);

    const termSet = new Set([lowerQuery, ...baseTerms, ...aiTerms]);
    return Array.from(termSet);
  } catch (error) {
    logger.warn('AI query expansion failed, using basic expansion', {
      error: error instanceof Error ? error.message : String(error),
    });

    return Array.from(new Set([lowerQuery, ...expandQueryBasic(query)]));
  }
}

export function expandQueryBasic(query: string): string[] {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 0);

  const expansions: Record<string, string[]> = {
    sci: ['наукова', 'технології', 'інновації'],
    fi: ['фантастика', 'майбутнє', 'космос'],
    любов: ['романтика', 'кохання', 'відносини'],
    кохання: ['романтика', 'любов', 'відносини'],
    романтик: ['романтика', 'любов', 'відносини'],
    детектив: ['кримінал', 'розслідування', 'таємниця'],
    фантастика: ['sci-fi', 'майбутнє', 'космос', 'технології'],
    жахи: ['хорор', 'страх', 'напруга'],
    історія: ['минуле', 'історичний', 'епоха'],
    романтика: ['любов', 'відносини', 'кохання'],
    пригоди: ['подорожі', 'екшн', 'ризико'],
    класика: ['література', 'традиція', 'майстри'],
  };

  const expanded = new Set<string>(terms);

  for (const term of terms) {
    const related = expansions[term];
    if (related) {
      related.forEach((r) => expanded.add(r));
    }
  }

  return Array.from(expanded);
}

let cleanupInterval: NodeJS.Timeout | null = null;

if (typeof global !== 'undefined' && !cleanupInterval) {
  cleanupInterval = setInterval(
    () => {
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

      toDelete.forEach((userId) => aiRequestsByUser.delete(userId));

      if (toDelete.length > 0) {
        logger.debug('AI rate limiter cleanup', { removedUsers: toDelete.length });
      }
    },
    5 * 60 * 1000
  );

  if (typeof process !== 'undefined') {
    process.on('exit', () => {
      if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
      }
    });
  }
}

export function cleanupAIHelper() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

export async function interactiveBookSelection(
  userAnswers: UserAnswers,
  allBooks: Book[]
): Promise<Book[]> {
  const { interest, mood, format } = userAnswers;

  let candidates = allBooks.filter((book) => book.is_available);

  if (candidates.length === 0) {
    return [];
  }

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
    candidates = allBooks.filter((book) => book.is_available);
  }

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

  candidates.sort((a, b) => {
    let scoreA = scoreFunc(a);
    let scoreB = scoreFunc(b);

    scoreA += (a.rating || 0) * 5;
    scoreB += (b.rating || 0) * 5;

    scoreA += Math.min((a.downloads_count || 0) / 10, 50);
    scoreB += Math.min((b.downloads_count || 0) / 10, 50);

    return scoreB - scoreA;
  });

  const maxBooks = Math.min(7, candidates.length);
  return candidates.slice(0, maxBooks);
}
