import { db, Book, getTopBooks } from './models';
import { logger } from '../utils/logger';

export const getRandomBook = (): Promise<Book | null> => {
  return new Promise((resolve, reject) => {
    logger.debug('Getting random book');

    db.get(
      'SELECT * FROM books WHERE (is_available = 1 OR is_available IS NULL) ORDER BY RANDOM() LIMIT 1',
      (err, row: Book) => {
        if (err) {
          logger.error(
            'Error getting random book',
            err instanceof Error ? err : new Error(String(err))
          );
          reject(err);
          return;
        }

        if (row) {
          logger.debug('Random book selected', { title: row.title, author: row.author });
          row.is_available = true;
          resolve(row);
        } else {
          logger.warn('No available books in database');
          resolve(null);
        }
      }
    );
  });
};

export const getRecentlyViewedBooks = (userId: number, limit: number = 5): Promise<Book[]> => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT b.* FROM books b
       INNER JOIN saved_books sb ON b.id = sb.book_id
       WHERE sb.user_id = ?
       ORDER BY sb.created_at DESC
       LIMIT ?`,
      [userId, limit],
      (err, rows: Book[]) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
};

export const getUserFavoriteGenres = (userId: number, limit: number = 3): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT b.genre, COUNT(*) as count
       FROM books b
       INNER JOIN saved_books sb ON b.id = sb.book_id
       WHERE sb.user_id = ?
       GROUP BY b.genre
       ORDER BY count DESC
       LIMIT ?`,
      [userId, limit],
      (err, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows.map((r) => r.genre));
      }
    );
  });
};

export const getRecommendedBooks = (userId: number, limit: number = 5): Promise<Book[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      const favoriteGenres = await getUserFavoriteGenres(userId, 3);

      if (favoriteGenres.length === 0) {
        const topBooks = await getTopBooks(limit);
        resolve(topBooks);
        return;
      }

      const placeholders = favoriteGenres.map(() => '?').join(',');

      db.all(
        `SELECT * FROM books 
         WHERE genre IN (${placeholders}) 
         AND is_available = 1
         AND id NOT IN (SELECT book_id FROM saved_books WHERE user_id = ?)
         ORDER BY rating DESC, downloads_count DESC
         LIMIT ?`,
        [...favoriteGenres, userId, limit],
        (err, rows: Book[]) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    } catch (error) {
      reject(error);
    }
  });
};

export const getUserReadingStats = (
  userId: number
): Promise<{
  savedCount: number;
  reviewsCount: number;
  favoriteGenres: string[];
}> => {
  return new Promise(async (resolve, reject) => {
    try {
      const savedCount = await new Promise<number>((res, rej) => {
        db.get(
          'SELECT COUNT(*) as count FROM saved_books WHERE user_id = ?',
          [userId],
          (err, row: any) => {
            if (err) rej(err);
            else res(row.count);
          }
        );
      });

      const reviewsCount = await new Promise<number>((res, rej) => {
        db.get(
          'SELECT COUNT(*) as count FROM reviews WHERE user_id = ?',
          [userId],
          (err, row: any) => {
            if (err) rej(err);
            else res(row.count);
          }
        );
      });

      const favoriteGenres = await getUserFavoriteGenres(userId, 5);

      resolve({ savedCount, reviewsCount, favoriteGenres });
    } catch (error) {
      reject(error);
    }
  });
};

export const getBooksBasedOnBehavior = (userId: number, limit: number = 10): Promise<Book[]> => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT b.*, 
              (SELECT COUNT(*) FROM saved_books WHERE book_id = b.id) as save_count,
              (SELECT AVG(rating) FROM reviews WHERE book_id = b.id) as avg_rating
       FROM books b
       WHERE b.genre IN (
         SELECT DISTINCT b2.genre 
         FROM books b2
         INNER JOIN saved_books sb ON b2.id = sb.book_id
         WHERE sb.user_id = ?
       )
       AND b.is_available = 1
       AND b.id NOT IN (SELECT book_id FROM saved_books WHERE user_id = ?)
       ORDER BY save_count DESC, avg_rating DESC, b.downloads_count DESC
       LIMIT ?`,
      [userId, userId, limit],
      (err, rows: Book[]) => {
        if (err) {
          reject(err);
          return;
        }

        if (rows && rows.length > 0) {
          resolve(rows);
        } else {
          db.all(
            `SELECT b.*, 
                    (SELECT COUNT(*) FROM saved_books WHERE book_id = b.id) as save_count,
                    (SELECT AVG(rating) FROM reviews WHERE book_id = b.id) as avg_rating
             FROM books b
             WHERE b.is_available = 1
             AND b.id NOT IN (SELECT book_id FROM saved_books WHERE user_id = ?)
             ORDER BY b.rating DESC, b.downloads_count DESC
             LIMIT ?`,
            [userId, limit],
            (err2, rows2: Book[]) => {
              if (err2) reject(err2);
              else resolve(rows2 || []);
            }
          );
        }
      }
    );
  });
};

export const getCollaborativeRecommendations = (
  userId: number,
  limit: number = 10
): Promise<Book[]> => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT b.*, COUNT(DISTINCT sb2.user_id) as similar_users
       FROM books b
       INNER JOIN saved_books sb2 ON b.id = sb2.book_id
       WHERE sb2.user_id IN (
         -- Find users with similar taste
         SELECT sb1.user_id
         FROM saved_books sb1
         WHERE sb1.book_id IN (
           SELECT book_id FROM saved_books WHERE user_id = ?
         )
         AND sb1.user_id != ?
         GROUP BY sb1.user_id
         HAVING COUNT(*) >= 2
       )
       AND b.id NOT IN (SELECT book_id FROM saved_books WHERE user_id = ?)
       AND b.is_available = 1
       GROUP BY b.id
       ORDER BY similar_users DESC, b.rating DESC
       LIMIT ?`,
      [userId, userId, userId, limit],
      (err, rows: Book[]) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
};

export const getContextualRecommendations = (
  userId: number,
  limit: number = 5
): Promise<Book[]> => {
  return (async () => {
    const hour = new Date().getHours();
    const { TIME_OF_DAY } = await import('../constants');
    let genrePreference: string[] = [];

    if (hour >= TIME_OF_DAY.MORNING_START && hour < TIME_OF_DAY.AFTERNOON_START) {
      genrePreference = ['Мотиваційна', 'Бізнес', 'Саморозвиток', 'Наукова'];
    } else if (hour >= TIME_OF_DAY.AFTERNOON_START && hour < TIME_OF_DAY.EVENING_START) {
      genrePreference = ['Історична', 'Біографія', 'Пригоди', 'Детектив'];
    } else if (hour >= TIME_OF_DAY.EVENING_START && hour < TIME_OF_DAY.NIGHT_START) {
      genrePreference = ['Романтика', 'Комедія', 'Фентезі', 'Сучасна проза'];
    } else {
      genrePreference = ['Поезія', 'Філософія', 'Класична література'];
    }

    return new Promise((resolve, reject) => {
      const placeholders = genrePreference.map(() => '?').join(',');

      db.all(
        `SELECT * FROM books 
       WHERE genre IN (${placeholders})
       AND is_available = 1
       AND id NOT IN (SELECT book_id FROM saved_books WHERE user_id = ?)
       ORDER BY rating DESC, downloads_count DESC
       LIMIT ?`,
        [...genrePreference, userId, limit],
        (err, rows: Book[]) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  })();
};

export const getSmartRecommendations = async (
  userId: number,
  limit: number = 10
): Promise<Book[]> => {
  try {
    const allRecommendations: Book[] = [];
    const seenIds = new Set<number>();

    const behaviorCount = Math.ceil(limit * 0.4);
    const collaborativeCount = Math.ceil(limit * 0.3);
    const contextualCount = limit - behaviorCount - collaborativeCount;

    const behaviorBooks = await getBooksBasedOnBehavior(userId, behaviorCount);
    for (const book of behaviorBooks) {
      if (!seenIds.has(book.id!)) {
        seenIds.add(book.id!);
        allRecommendations.push(book);
      }
    }

    const collaborativeBooks = await getCollaborativeRecommendations(userId, collaborativeCount);
    for (const book of collaborativeBooks) {
      if (!seenIds.has(book.id!)) {
        seenIds.add(book.id!);
        allRecommendations.push(book);
      }
    }

    const contextualBooks = await getContextualRecommendations(userId, contextualCount);
    for (const book of contextualBooks) {
      if (!seenIds.has(book.id!)) {
        seenIds.add(book.id!);
        allRecommendations.push(book);
      }
    }

    if (allRecommendations.length < limit) {
      const topBooks = await getTopBooks(limit - allRecommendations.length);
      for (const book of topBooks) {
        if (!seenIds.has(book.id!)) {
          seenIds.add(book.id!);
          allRecommendations.push(book);
        }
      }
    }

    if (allRecommendations.length < limit) {
      const newestBooks = await new Promise<Book[]>((resolve, reject) => {
        db.all(
          `SELECT * FROM books 
           WHERE is_available = 1
           AND id NOT IN (SELECT book_id FROM saved_books WHERE user_id = ?)
           ORDER BY created_at DESC
           LIMIT ?`,
          [userId, limit - allRecommendations.length],
          (err, rows: Book[]) => {
            if (err) reject(err);
            else resolve(rows || []);
          }
        );
      });

      for (const book of newestBooks) {
        if (!seenIds.has(book.id!)) {
          seenIds.add(book.id!);
          allRecommendations.push(book);
        }
      }
    }

    return allRecommendations.slice(0, limit);
  } catch (error) {
    logger.error(
      'Error getting smart recommendations',
      error instanceof Error ? error : new Error(String(error))
    );

    return getRecommendedBooks(userId, limit);
  }
};
