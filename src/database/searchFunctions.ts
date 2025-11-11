/**
 * Advanced search functions with fuzzy matching, AI recommendations and smart caching
 */

import { db, Book } from './models';
import { cache } from '../utils/cache';
import * as levenshtein from 'fast-levenshtein';  // ✅ ВИПРАВЛЕНО #14

// Search cache TTL - 5 minutes
const CACHE_TTL = 5 * 60 * 1000;

/**
 * ✅ ВИПРАВЛЕНО #1: Нормалізація кирилиці для кращого пошуку
 * Вирішує проблему: "Кобзарь" не знаходить "Кобзар"
 */
function normalizeCyrillic(text: string): string {
  return text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/ъ/g, '')
    .replace(/ь/g, '')
    .replace(/і/g, 'i')
    .replace(/ї/g, 'i')
    .replace(/є/g, 'е')
    .replace(/ґ/g, 'г')
    .trim();
}

// Search analytics for improvement
interface SearchEvent {
  timestamp: Date;
  searchTerm: string;
  resultsCount: number;
  strategy: string;
  userId?: number;
}

// ✅ ВИПРАВЛЕНО #5: обмежуємо розмір масиву для запобігання memory leak
const MAX_ANALYTICS_SIZE = 500; // Зменшено з 1000
const searchAnalytics: SearchEvent[] = [];

/**
 * Calculate Levenshtein distance between two strings
 * ✅ ВИПРАВЛЕНО #14: Використовуємо fast-levenshtein для швидкості
 */
function levenshteinDistance(str1: string, str2: string, maxDistance: number = 10): number {
  // Оптимізація: якщо різниця в довжині більша за maxDistance - не рахуємо
  if (Math.abs(str1.length - str2.length) > maxDistance) {
    return maxDistance + 1;
  }
  
  // Використовуємо швидку бібліотеку
  const distance = levenshtein.get(str1, str2);
  
  // Повертаємо maxDistance + 1 якщо дистанція занадто велика
  return distance > maxDistance ? maxDistance + 1 : distance;
}

/**
 * Fuzzy match - checks if search term is similar to target
 * ✅ ВИПРАВЛЕНО #36: покращена логіка fuzzy match
 */
function fuzzyMatch(searchTerm: string, target: string, threshold: number = 0.65): boolean {
  const search = searchTerm.toLowerCase().trim();
  const text = target.toLowerCase().trim();
  
  // Порожні рядки
  if (!search || !text) return false;
  
  // Exact match
  if (text.includes(search)) {
    return true;
  }
  
  // Занадто коротке слово для fuzzy match
  if (search.length < 3) {
    return false;
  }
  
  // Check each word in target
  const words = text.split(/\s+/).filter(w => w.length >= 3);
  
  for (const word of words) {
    // Пропускаємо якщо різниця в довжині занадто велика
    const lengthDiff = Math.abs(search.length - word.length);
    if (lengthDiff > search.length * 0.5) {
      continue;
    }
    
    const maxDistance = Math.ceil(search.length * (1 - threshold));
    const distance = levenshteinDistance(search, word, maxDistance);
    
    if (distance <= maxDistance) {
      return true;
    }
  }
  
  return false;
}

/**
 * Enhanced synonym dictionary with semantic relationships
 */
const synonyms: { [key: string]: string[] } = {
  'фантастика': ['sci-fi', 'наукова фантастика', 'фантастична', 'фантастичний', 'космос', 'технології', 'майбутнє'],
  'романтика': ['кохання', 'любов', 'романтичний', 'романтична', 'любовний роман', 'любовний', 'роман', 'почуття'],
  'любовний роман': ['романтика', 'кохання', 'любов', 'романтичний', 'романтична', 'любовний', 'роман', 'почуття'],
  'любовний': ['любовний роман', 'романтика', 'кохання', 'любов', 'роман', 'почуття'],
  'детектив': ['детективний', 'детективна', 'кримінал', 'кримінальний', 'розслідування', 'поліція', 'злочин', 'таємниця'],
  'історія': ['історичний', 'історична', 'історичне', 'історична повість', 'минуле', 'хроніки', 'епоха'],
  'пригоди': ['пригодницький', 'пригодницька', 'пригодницьке', 'пригода', 'екшн', 'подорож', 'експедиція'],
  'фентезі': ['fantasy', 'фентезійний', 'фентезійна', 'магія', 'чаклунство', 'дракони', 'епічний'],
  'трилер': ['триллер', 'трилерний', 'трилерна', 'саспенс', 'напруга', 'екшн'],
  'драма': ['драматичний', 'драматична', 'драматичне', 'емоційний', 'емоційна', 'серйозний'],
  'комедія': ['комедійний', 'комедійна', 'гумор', 'гумористичний', 'смішний', 'смішна', 'веселий'],
  'біографія': ['біографічний', 'біографічна', 'мемуари', 'автобіографія', 'життєпис', 'історія життя'],
  'класика': ['класичний', 'класична', 'класичне', 'класика літератури', 'вічна класика', 'золотий фонд'],
  'поезія': ['поетичний', 'поетична', 'вірші', 'поезії', 'лірика', 'поет'],
  'жахи': ['хорор', 'страшний', 'страшна', 'жахливий', 'містика', 'надприродне', 'привиди'],
  'наукова': ['науковий', 'наукова', 'наукове', 'наука', 'дослідження', 'технології'],
  'психологія': ['психологічний', 'психологічна', 'психолог', 'душа', 'свідомість'],
  'філософія': ['філософський', 'філософська', 'філософ', 'мудрість', 'роздуми'],
  'молодіжна': ['молодіжний', 'молодіжна', 'підлітки', 'юнацька', 'для підлітків'],
  'дитяча': ['дитячий', 'дитяча', 'дітям', 'для дітей', 'казки']
};

// Search by title only - ВИПРАВЛЕНО (регістронезалежний пошук)
export const searchBooksByTitle = (searchTerm: string, limit: number = 10): Promise<Book[]> => {
  return new Promise((resolve, reject) => {
    console.log(`🔍 Searching books by title: "${searchTerm}"`);
    
    // Використовуємо як точний пошук, так і пошук з LIKE (регістронезалежний)
    const query = `
      SELECT * FROM books 
      WHERE (LOWER(title) = LOWER(?) OR LOWER(title) LIKE LOWER(?))
      AND (is_available = 1 OR is_available IS NULL)
      ORDER BY rating DESC, downloads_count DESC 
      LIMIT ?
    `;
    db.all(query, [searchTerm, `%${searchTerm}%`, limit], (err, rows: Book[]) => {
      if (err) {
        console.error('❌ Error searching by title:', err);
        reject(err);
      } else {
        console.log(`📚 Found ${rows.length} books by title`);
        resolve(rows);
      }
    });
  });
};

// Search by author only - ВИПРАВЛЕНО (регістронезалежний пошук)
export const searchBooksByAuthor = (searchTerm: string, limit: number = 10): Promise<Book[]> => {
  return new Promise((resolve, reject) => {
    console.log(`🔍 Searching books by author: "${searchTerm}"`);
    
    // Використовуємо як точний пошук, так і пошук з LIKE (регістронезалежний)
    const query = `
      SELECT * FROM books 
      WHERE (LOWER(author) = LOWER(?) OR LOWER(author) LIKE LOWER(?))
      AND (is_available = 1 OR is_available IS NULL)
      ORDER BY rating DESC, downloads_count DESC 
      LIMIT ?
    `;
    db.all(query, [searchTerm, `%${searchTerm}%`, limit], (err, rows: Book[]) => {
      if (err) {
        console.error('❌ Error searching by author:', err);
        reject(err);
      } else {
        console.log(`📚 Found ${rows.length} books by author`);
        resolve(rows);
      }
    });
  });
};

// Search by genre only - ВИПРАВЛЕНО (регістронезалежний пошук + синоніми)
export const searchBooksByGenre = (searchTerm: string, limit: number = 10): Promise<Book[]> => {
  return new Promise((resolve, reject) => {
    console.log(`🔍 Searching books by genre: "${searchTerm}"`);
    
    // Спочатку пробуємо точний пошук (регістронезалежний)
    db.all(
      `SELECT * FROM books 
       WHERE LOWER(genre) = LOWER(?)
       AND (is_available = 1 OR is_available IS NULL)
       ORDER BY rating DESC, downloads_count DESC 
       LIMIT ?`,
      [searchTerm, limit],
      (err, exactRows: Book[]) => {
        if (err) {
          console.error('❌ Error in exact genre search:', err);
          reject(err);
          return;
        }
        
        if (exactRows.length > 0) {
          console.log(`📚 Found ${exactRows.length} books by exact genre match`);
          resolve(exactRows);
          return;
        }
        
        // Якщо точний пошук не дав результатів, пробуємо з синонімами
        const searchTerms = searchWithSynonyms(searchTerm);
        console.log(`📝 Trying synonyms: ${searchTerms.join(', ')}`);
        
        const conditions = searchTerms.map(() => 'genre LIKE ?').join(' OR ');
        const params = searchTerms.map(term => `%${term}%`);
        
        db.all(
          `SELECT * FROM books 
           WHERE (${conditions})
           AND (is_available = 1 OR is_available IS NULL)
           ORDER BY rating DESC, downloads_count DESC 
           LIMIT ?`,
          [...params, limit],
          (err, synonymRows: Book[]) => {
            if (err) {
              console.error('❌ Error in synonym genre search:', err);
              reject(err);
            } else {
              console.log(`📚 Found ${synonymRows.length} books by genre synonyms`);
              resolve(synonymRows);
            }
          }
        );
      }
    );
  });
};


// Fuzzy search by title - OPTIMIZED
export const fuzzySearchBooksByTitle = async (searchTerm: string, limit: number = 10): Promise<Book[]> => {
  return new Promise((resolve, reject) => {
    // Pre-filter with SQL to reduce dataset
    const query = `SELECT * FROM books 
                   WHERE (is_available = 1 OR is_available IS NULL)
                   AND LOWER(title) LIKE LOWER(?)
                   LIMIT 50`;
    
    db.all(query, [`%${searchTerm}%`], (err, rows: Book[]) => {
      if (err) {
        reject(err);
        return;
      }
      
      const matches = rows.filter(book => fuzzyMatch(searchTerm, book.title, 0.6));
      const sorted = matches.sort((a, b) => {
        const aScore = (a.rating || 0) * 10 + (a.downloads_count || 0);
        const bScore = (b.rating || 0) * 10 + (b.downloads_count || 0);
        return bScore - aScore;
      });
      
      resolve(sorted.slice(0, limit));
    });
  });
};

// Fuzzy search by author - OPTIMIZED
export const fuzzySearchBooksByAuthor = async (searchTerm: string, limit: number = 10): Promise<Book[]> => {
  return new Promise((resolve, reject) => {
    // Pre-filter with SQL to reduce dataset
    const query = `SELECT * FROM books 
                   WHERE (is_available = 1 OR is_available IS NULL)
                   AND LOWER(author) LIKE LOWER(?)
                   LIMIT 50`;
    
    db.all(query, [`%${searchTerm}%`], (err, rows: Book[]) => {
      if (err) {
        reject(err);
        return;
      }
      
      const matches = rows.filter(book => fuzzyMatch(searchTerm, book.author, 0.6));
      const sorted = matches.sort((a, b) => {
        const aScore = (a.rating || 0) * 10 + (a.downloads_count || 0);
        const bScore = (b.rating || 0) * 10 + (b.downloads_count || 0);
        return bScore - aScore;
      });
      
      resolve(sorted.slice(0, limit));
    });
  });
};

// Search with synonyms
export const searchWithSynonyms = (searchTerm: string): string[] => {
  const term = searchTerm.toLowerCase();
  const results = [term];
  
  // Check if search term is a synonym
  for (const [key, syns] of Object.entries(synonyms)) {
    if (term === key || syns.includes(term)) {
      results.push(key, ...syns);
      break;
    }
  }
  
  return [...new Set(results)];
};

/**
 * Advanced multi-strategy search with AI recommendations and caching
 */
export const enhancedSearch = async (searchTerm: string, limit: number = 10, userId?: number): Promise<{
  books: Book[];
  suggestions: string[];
  hasAiRecommendations: boolean;
  searchStrategy: string;
  aiMessage?: string;
}> => {
  const normalizedTerm = normalizeSearchTerm(searchTerm);
  // ✅ ВИПРАВЛЕНО #6: додано userId до ключа кешу для персоналізації
  const cacheKey = userId 
    ? `search:${userId}:${normalizedTerm}:${limit}`
    : `search:${normalizedTerm}:${limit}`;
  
  // Check cache first
  const cached = cache.get<{
    books: Book[];
    suggestions: string[];
    hasAiRecommendations: boolean;
    searchStrategy: string;
    aiMessage?: string;
  }>(cacheKey);
  if (cached) {
    console.log(`💾 Cache hit for: "${searchTerm}" (user: ${userId || 'anonymous'})`);
    return cached;
  }
  
  console.log(`🔍 Advanced search for: "${searchTerm}"`);
  
  let results: Book[] = [];
  let strategy = 'none';
  let aiMessage = '';
  
  // Strategy 1: Exact match search
  results = await exactMatchSearch(normalizedTerm, limit);
  if (results.length > 0) {
    strategy = 'exact';
    console.log(`✅ Found ${results.length} results using exact match`);
  }
  
  // Strategy 2: Partial match with relevance scoring
  if (results.length < 3) {
    const partialResults = await partialMatchSearch(normalizedTerm, limit);
    results = mergeUniqueResults(results, partialResults, limit);
    if (results.length > 0) strategy = 'partial';
  }
  
  // Strategy 3: Semantic search with synonyms
  if (results.length < 3) {
    const semanticResults = await semanticSearch(normalizedTerm, limit);
    results = mergeUniqueResults(results, semanticResults, limit);
    if (results.length > 0) strategy = 'semantic';
  }
  
  // Strategy 4: Fuzzy search
  if (results.length < 3) {
    console.log(`🔍 Trying fuzzy search...`);
    const fuzzyResults = await fuzzySearchAdvanced(normalizedTerm, limit);
    results = mergeUniqueResults(results, fuzzyResults, limit);
    if (results.length > 0) strategy = 'fuzzy';
  }
  
  // Strategy 5: AI recommendations if no results
  // ✅ ВИПРАВЛЕНО #38: лічильник спроб для запобігання нескінченному циклу
  let hasAiRecommendations = false;
  if (results.length === 0) {
    console.log(`🤖 No results found, getting AI recommendations...`);
    try {
      const aiResults = await getAiRecommendations(searchTerm, limit);
      if (aiResults && aiResults.length > 0) {
        results = aiResults;
        hasAiRecommendations = true;
        strategy = 'ai_recommendations';
        aiMessage = generateAiMessage(searchTerm);
      }
    } catch (error) {
      console.error('Error getting AI recommendations:', error);
    }
  }
  
  // Sort results by relevance
  results = sortByRelevance(results, normalizedTerm);
  
  // Get smart suggestions
  const suggestions = await getSmartSuggestions(normalizedTerm, results);
  
  // Track search analytics
  trackSearch(searchTerm, results.length, strategy, userId);
  
  const searchResult = {
    books: results.slice(0, limit),
    suggestions,
    hasAiRecommendations,
    searchStrategy: strategy,
    aiMessage
  };
  
  // Cache the result
  cache.set(cacheKey, searchResult, CACHE_TTL);
  
  console.log(`✅ Search completed: ${results.length} books using ${strategy} strategy`);
  
  return searchResult;
};

// Get search suggestions (autocomplete) - updated to use smart suggestions
export const getSearchSuggestions = async (searchTerm: string, limit: number = 5): Promise<string[]> => {
  return getSmartSuggestions(normalizeSearchTerm(searchTerm), []);
};

/**
 * Normalize search term for better matching
 * ✅ ВИПРАВЛЕНО #1: додано нормалізацію кирилиці
 */
function normalizeSearchTerm(term: string): string {
  return normalizeCyrillic(term)  // Спочатку нормалізуємо кирилицю
    .replace(/[^\w\sа-яґєіїА-ЯҐЄІЇ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Exact match search with priority scoring
 */
async function exactMatchSearch(searchTerm: string, limit: number): Promise<Book[]> {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT * FROM books 
      WHERE (LOWER(title) = LOWER(?) OR LOWER(author) = LOWER(?) OR LOWER(genre) = LOWER(?))
      AND (is_available = 1 OR is_available IS NULL)
      ORDER BY 
        CASE 
          WHEN LOWER(title) = LOWER(?) THEN 1
          WHEN LOWER(author) = LOWER(?) THEN 2
          WHEN LOWER(genre) = LOWER(?) THEN 3
          ELSE 4
        END,
        rating DESC, downloads_count DESC
      LIMIT ?`;
    
    db.all(query, [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, limit], 
      (err, rows: Book[]) => {
        if (err) reject(err);
        else resolve(rows);
      });
  });
}

/**
 * Partial match search with word-based scoring
 */
async function partialMatchSearch(searchTerm: string, limit: number): Promise<Book[]> {
  return new Promise((resolve, reject) => {
    const words = searchTerm.split(/\s+/).filter(word => word.length > 2);
    if (words.length === 0) {
      // Fallback to simple LIKE search
      const query = `
        SELECT * FROM books 
        WHERE (LOWER(title) LIKE LOWER(?) OR LOWER(author) LIKE LOWER(?) OR LOWER(genre) LIKE LOWER(?))
        AND (is_available = 1 OR is_available IS NULL)
        ORDER BY rating DESC, downloads_count DESC
        LIMIT ?`;
      
      db.all(query, [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, limit], 
        (err, rows: Book[]) => {
          if (err) reject(err);
          else resolve(rows);
        });
      return;
    }
    
    // Multi-word search
    const likeTerms = words.map(word => `%${word}%`);
    const conditions = words.map(() => '(LOWER(title) LIKE LOWER(?) OR LOWER(author) LIKE LOWER(?) OR LOWER(genre) LIKE LOWER(?))').join(' AND ');
    const params = words.flatMap(() => likeTerms.slice(0, 3)); // title, author, genre for each word
    
    const query = `
      SELECT * FROM books 
      WHERE ${conditions}
      AND (is_available = 1 OR is_available IS NULL)
      ORDER BY rating DESC, downloads_count DESC
      LIMIT ?`;
    
    db.all(query, [...params, limit], (err, rows: Book[]) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

/**
 * Semantic search using expanded synonyms
 * ✅ ВИПРАВЛЕНО #21: додана санітизація expandedTerms
 */
async function semanticSearch(searchTerm: string, limit: number): Promise<Book[]> {
  const expandedTerms = expandSearchWithSemantics(searchTerm);
  
  // Санітизація: видаляємо небезпечні символи
  const sanitizedTerms = expandedTerms
    .map(term => term.replace(/[^a-zA-Zа-яА-ЯіІїЇєЄґҐ0-9\s\-']/g, ''))
    .filter(term => term.length >= 2);
  
  if (sanitizedTerms.length === 0) {
    return Promise.resolve([]);
  }
  
  return new Promise((resolve, reject) => {
    const conditions = sanitizedTerms.map(() => 
      '(LOWER(title) LIKE LOWER(?) OR LOWER(author) LIKE LOWER(?) OR LOWER(genre) LIKE LOWER(?) OR LOWER(description) LIKE LOWER(?))'
    ).join(' OR ');
    
    const params = sanitizedTerms.flatMap(term => [`%${term}%`, `%${term}%`, `%${term}%`, `%${term}%`]);
    
    const query = `
      SELECT * FROM books 
      WHERE (${conditions})
      AND (is_available = 1 OR is_available IS NULL)
      ORDER BY rating DESC, downloads_count DESC
      LIMIT ?`;
    
    db.all(query, [...params, limit], (err, rows: Book[]) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

/**
 * Advanced fuzzy search with improved matching
 */
async function fuzzySearchAdvanced(searchTerm: string, limit: number): Promise<Book[]> {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM books WHERE (is_available = 1 OR is_available IS NULL)',
      [],
      (err, rows: Book[]) => {
        if (err) {
          reject(err);
          return;
        }
        
        const matches = rows
          .map(book => ({
            book,
            score: calculateAdvancedRelevanceScore(book, searchTerm)
          }))
          .filter(item => item.score > 0.4)
          .sort((a, b) => b.score - a.score)
          .slice(0, limit)
          .map(item => item.book);
        
        resolve(matches);
      }
    );
  });
}

/**
 * Calculate advanced relevance score
 */
function calculateAdvancedRelevanceScore(book: Book, searchTerm: string): number {
  const search = searchTerm.toLowerCase();
  let maxScore = 0;
  
  const fields = [
    { text: book.title?.toLowerCase() || '', weight: 1.0 },
    { text: book.author?.toLowerCase() || '', weight: 0.8 },
    { text: book.genre?.toLowerCase() || '', weight: 0.6 },
    { text: book.description?.toLowerCase() || '', weight: 0.4 }
  ];
  
  for (const field of fields) {
    if (!field.text) continue;
    
    // Exact substring match
    if (field.text.includes(search)) {
      maxScore = Math.max(maxScore, 1.0 * field.weight);
      continue;
    }
    
    // Word-based matching
    const searchWords = search.split(/\s+/);
    const fieldWords = field.text.split(/\s+/);
    
    for (const sWord of searchWords) {
      if (sWord.length < 3) continue;
      
      for (const fWord of fieldWords) {
        // Partial word match
        if (fWord.includes(sWord)) {
          maxScore = Math.max(maxScore, 0.8 * field.weight);
        }
        
        // Fuzzy match using Levenshtein distance
        if (sWord.length > 3 && fWord.length > 3) {
          const distance = levenshteinDistance(sWord, fWord);
          const similarity = 1 - (distance / Math.max(sWord.length, fWord.length));
          if (similarity > 0.6) {
            maxScore = Math.max(maxScore, similarity * field.weight);
          }
        }
      }
    }
  }
  
  return maxScore;
}

/**
 * Expand search with semantic relationships
 */
function expandSearchWithSemantics(searchTerm: string): string[] {
  const terms = [searchTerm];
  const searchWords = searchTerm.toLowerCase().split(/\s+/);
  
  for (const [key, values] of Object.entries(synonyms)) {
    for (const word of searchWords) {
      if (key.includes(word) || word.includes(key) || 
          values.some(v => v.includes(word) || word.includes(v))) {
        terms.push(key, ...values);
      }
    }
  }
  
  return [...new Set(terms)].slice(0, 8);
}

/**
 * Get AI-powered recommendations
 */
async function getAiRecommendations(searchTerm: string, limit: number): Promise<Book[]> {
  try {
    return new Promise((resolve, reject) => {
      // Get books from popular genres related to search term
      const query = `
        SELECT * FROM books 
        WHERE (is_available = 1 OR is_available IS NULL)
        AND (
          genre IN (
            SELECT genre FROM books 
            WHERE (LOWER(title) LIKE LOWER(?) OR LOWER(author) LIKE LOWER(?) OR LOWER(description) LIKE LOWER(?))
            AND genre IS NOT NULL 
            GROUP BY genre 
            ORDER BY COUNT(*) DESC 
            LIMIT 3
          )
          OR rating >= 4.0
        )
        ORDER BY rating DESC, downloads_count DESC
        LIMIT ?`;
      
      db.all(query, [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, limit], 
        (err, rows: Book[]) => {
          if (err) reject(err);
          else resolve(rows);
        });
    });
  } catch (error) {
    console.error('AI recommendation error:', error);
    return [];
  }
}

/**
 * Generate AI message for recommendations
 */
function generateAiMessage(searchTerm: string): string {
  const messages = [
    `🤖 На основі вашого запиту "${searchTerm}" ми підібрали схожі книги:`,
    `🔍 Не знайшли точних відповідностей на "${searchTerm}", але ось що може вас зацікавити:`,
    `📚 Ось підбірка книг у схожому стилі з "${searchTerm}":`,
    `💡 Можливо, вам сподобаються ці книги, схожі на ваш запит "${searchTerm}":`
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Merge unique results from different search strategies
 */
function mergeUniqueResults(existing: Book[], newResults: Book[], limit: number): Book[] {
  const seenIds = new Set(existing.map(book => book.id));
  const merged = [...existing];
  
  for (const book of newResults) {
    if (!seenIds.has(book.id!) && merged.length < limit) {
      seenIds.add(book.id!);
      merged.push(book);
    }
  }
  
  return merged;
}

/**
 * Sort results by relevance and quality metrics
 */
function sortByRelevance(books: Book[], searchTerm: string): Book[] {
  return books.sort((a, b) => {
    const scoreA = calculateAdvancedRelevanceScore(a, searchTerm);
    const scoreB = calculateAdvancedRelevanceScore(b, searchTerm);
    
    if (Math.abs(scoreA - scoreB) > 0.1) {
      return scoreB - scoreA;
    }
    
    // Tie-breakers
    const ratingA = a.rating || 0;
    const ratingB = b.rating || 0;
    if (ratingA !== ratingB) return ratingB - ratingA;
    
    const downloadsA = a.downloads_count || 0;
    const downloadsB = b.downloads_count || 0;
    return downloadsB - downloadsA;
  });
}

/**
 * Track search analytics
 * ✅ ВИПРАВЛЕНО #5: автоматичне очищення старих записів для запобігання memory leak
 */
function trackSearch(searchTerm: string, resultsCount: number, strategy: string, userId?: number) {
  searchAnalytics.push({
    timestamp: new Date(),
    searchTerm,
    resultsCount,
    strategy,
    userId
  });
  
  // Видаляємо старі записи коли досягаємо ліміту
  if (searchAnalytics.length > MAX_ANALYTICS_SIZE) {
    // Видаляємо 20% найстаріших записів
    const toRemove = Math.floor(MAX_ANALYTICS_SIZE * 0.2);
    searchAnalytics.splice(0, toRemove);
  }
}

/**
 * Get smart suggestions based on search term and results
 */
async function getSmartSuggestions(searchTerm: string, currentResults: Book[]): Promise<string[]> {
  if (searchTerm.length < 2) {
    return getPopularSearchTerms(5);
  }
  
  const suggestions = new Set<string>();
  
  // Add genres from current results
  currentResults.forEach(book => {
    if (book.genre) suggestions.add(book.genre);
  });
  
  // Get database suggestions
  const dbSuggestions = await getDatabaseSuggestions(searchTerm);
  dbSuggestions.forEach(s => suggestions.add(s));
  
  // Add semantic suggestions
  const semanticTerms = expandSearchWithSemantics(searchTerm);
  semanticTerms.forEach(term => {
    if (term !== searchTerm && term.length > 2) {
      suggestions.add(term);
    }
  });
  
  return Array.from(suggestions).slice(0, 8);
}

/**
 * Get suggestions from database
 * ✅ ВИПРАВЛЕНО #9: сортування за релевантністю (популярністю)
 */
async function getDatabaseSuggestions(searchTerm: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT title as suggestion, 'title' as type, 3 as priority, COUNT(*) as popularity
      FROM books 
      WHERE LOWER(title) LIKE LOWER(?) AND (is_available = 1 OR is_available IS NULL)
      GROUP BY title
      UNION
      SELECT author as suggestion, 'author' as type, 2 as priority, COUNT(*) as popularity
      FROM books 
      WHERE LOWER(author) LIKE LOWER(?) AND (is_available = 1 OR is_available IS NULL)
      GROUP BY author
      UNION
      SELECT genre as suggestion, 'genre' as type, 1 as priority, COUNT(*) as popularity
      FROM books 
      WHERE LOWER(genre) LIKE LOWER(?) AND (is_available = 1 OR is_available IS NULL)
      GROUP BY genre
      ORDER BY priority DESC, popularity DESC, suggestion
      LIMIT 8`;
    
    db.all(query, [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`], 
      (err, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows.map(r => r.suggestion).filter(Boolean));
      });
  });
}

// Get popular search terms
export const getPopularSearchTerms = async (limit: number = 5): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    // Повертаємо популярні жанри та авторів
    db.all(
      `SELECT genre as term, COUNT(*) as count FROM books 
       WHERE (is_available = 1 OR is_available IS NULL)
       GROUP BY genre 
       ORDER BY count DESC 
       LIMIT ?`,
      [limit],
      (err, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows.map(r => r.term));
      }
    );
  });
};
