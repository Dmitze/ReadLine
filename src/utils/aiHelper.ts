/**
 * AI Helper Functions - заглушки для AI функцій
 * Поки що використовуємо прості алгоритми замість справжнього AI
 */

import { Book } from '../database/models';

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
 */
export async function naturalLanguageSearch(
  query: string, 
  allBooks: Book[]
): Promise<Book[]> {
  // Простий алгоритм пошуку за ключовими словами
  const keywords = query.toLowerCase().split(' ');
  
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
  
  // Сортуємо за релевантністю (рейтинг + кількість завантажень)
  return results.sort((a, b) => {
    const scoreA = (a.rating || 0) * 10 + (a.downloads_count || 0);
    const scoreB = (b.rating || 0) * 10 + (b.downloads_count || 0);
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
  return candidates.slice(0, 5).map(book => ({
    ...book,
    aiSummary: generateAISummary(book),
    reason: generateRecommendationReason(book, userProfile)
  }));
}

/**
 * Генерація AI резюме (заглушка)
 */
function generateAISummary(book: Book): string {
  const summaries = [
    `Захоплююча історія про ${book.genre.toLowerCase()}, яка не залишить вас байдужими.`,
    `Чудова книга в жанрі "${book.genre}" з неочікуваними поворотами сюжету.`,
    `Майстерно написана робота автора ${book.author} в стилі ${book.genre.toLowerCase()}.`,
    `Книга, яка змінить ваше уявлення про ${book.genre.toLowerCase()}.`,
    `Неперевершений твір, який поєднує в собі найкращі традиції жанру ${book.genre.toLowerCase()}.`
  ];
  
  return summaries[Math.floor(Math.random() * summaries.length)];
}

/**
 * Генерація причини рекомендації (заглушка)
 */
function generateRecommendationReason(book: Book, userProfile: UserProfile): string {
  const { favoriteGenres } = userProfile;
  
  if (favoriteGenres.includes(book.genre)) {
    return `Рекомендую, оскільки вам подобається жанр "${book.genre}"`;
  }
  
  if (book.rating && book.rating > 4) {
    return `Високий рейтинг (${book.rating.toFixed(1)}/5) - читачі в захваті!`;
  }
  
  if (book.downloads_count && book.downloads_count > 100) {
    return `Популярна книга - завантажили ${book.downloads_count} разів`;
  }
  
  return `Цікава книга в жанрі "${book.genre}" від талановитого автора`;
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

/**
 * AI чат-бот з Gemini API
 */
export async function askAI(question: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY не налаштований');
  }
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Ти - помічник бібліотеки ReadLine. Відповідай українською мовою коротко та корисно на питання про книги, літературу та читання. Питання: ${question}`
          }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API помилка: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      return data.candidates[0].content.parts[0].text;
    }
    
    throw new Error('Некоректна відповідь від Gemini API');
    
  } catch (error) {
    console.error('❌ Gemini API error:', error);
    
    // Fallback до простих відповідей
    const lowerQuestion = question.toLowerCase();
    
    if (lowerQuestion.includes('рекоменд') || lowerQuestion.includes('пораді')) {
      return 'Рекомендую почати з класичної української літератури: "Кобзар" Тараса Шевченка або "Лісова пісня" Лесі Українки.';
    }
    
    if (lowerQuestion.includes('жанр') || lowerQuestion.includes('що читати')) {
      return 'Залежить від вашого настрою! Для відпочинку - романтика, для пригод - фантастика, для роздумів - філософія.';
    }
    
    if (lowerQuestion.includes('автор')) {
      return 'Серед українських авторів рекомендую: Тарас Шевченко, Леся Українка, Іван Франко, Михайло Коцюбинський.';
    }
    
    return 'Цікаве питання! Спробуйте переглянути наш каталог книг або скористайтеся пошуком за жанрами.';
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