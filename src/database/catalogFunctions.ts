import { db, Book } from './models';
import { safeParseFloat } from '../utils/helpers';
import { QueryBuilder } from './QueryBuilder';

/**
 * SQL Parameter Types - replaces 'any'
 * Supported types for SQL query parameters
 */
export type SQLParameter = string | number | boolean | null | undefined;
export type SQLParameters = SQLParameter[];

export interface CatalogFilters {
  genre?: string;
  hasAudio?: boolean;
  minRating?: number;
  sortBy?: 'rating' | 'date' | 'title' | 'downloads';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

interface CountRow {
  total: number;
}

/**
 * Отримати книги з фільтрами та сортуванням
 * Використовує QueryBuilder для динамічних SQL запитів
 * @param filters - Фільтри та налаштування сортування
 * @returns Об'єкт з масивом книг та загальною кількістю
 */
export const getBooksWithFilters = async (
  filters: CatalogFilters
): Promise<{ books: Book[]; total: number }> => {
  // ✅ Використати QueryBuilder для динамічних запитів
  const qb = new QueryBuilder()
    .from('books')
    .where('is_available', '=', 1);

  if (filters.genre) {
    qb.where('genre', '=', filters.genre);
  }

  if (filters.hasAudio) {
    qb.where('audio_file_id', 'IS NOT NULL')
      .or('audio_external_link', 'IS NOT NULL');
  }

  if (filters.minRating !== undefined) {
    // ✅ Валідація minRating
    const safeMinRating = safeParseFloat(filters.minRating, 0);
    if (safeMinRating >= 0 && safeMinRating <= 5) {
      qb.where('rating', '>=', safeMinRating);
    }
  }

  const sortBy = filters.sortBy || 'date';
  const sortOrder = (filters.sortOrder || 'desc').toUpperCase() as 'ASC' | 'DESC';

  switch (sortBy) {
    case 'rating':
      qb.orderBy('rating', sortOrder)
         .orderBy('reviews_count', 'DESC');
      break;
    case 'date':
      qb.orderBy('created_at', sortOrder);
      break;
    case 'title':
      qb.orderBy('title', sortOrder);
      break;
    case 'downloads':
      qb.orderBy('downloads_count', sortOrder);
      break;
    default:
      qb.orderBy('created_at', 'DESC');
  }

  const countQuery = qb.clone().columns('COUNT(*) as total');
  const dataQuery = qb
    .limit(filters.limit || 10)
    .offset(filters.offset || 0);

  const [totalResult, books] = await Promise.all([
    new Promise<{ total: number } | undefined>((resolve, reject) => {
      db.get<{ total: number }>(countQuery.build().sql, countQuery.getParameters(), (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    }),
    new Promise<Book[]>((resolve, reject) => {
      db.all<Book>(dataQuery.build().sql, dataQuery.getParameters(), (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    })
  ]);

  return { books, total: totalResult?.total || 0 };
};

/**
 * Отримати книги з аудіо
 * @param limit - Максимальна кількість книг (за замовчуванням 10)
 * @returns Масив книг з аудіо
 */
export const getBooksWithAudio = (limit: number = 10): Promise<Book[]> => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM books WHERE (
        audio_file_id IS NOT NULL 
        OR audio_external_link IS NOT NULL 
        OR file_type = 'audio'
      ) AND is_available = 1 ORDER BY created_at DESC LIMIT ?`,
      [limit],
      (err, rows: Book[]) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
};

// Отримати книги з високим рейтингом
/**
 * Отримати книги з високим рейтингом
 * @param minRating - Мінімальний рейтинг (за замовчуванням 4)
 * @param limit - Максимальна кількість книг (за замовчуванням 10)
 * @returns Масив книг з високим рейтингом
 */
export const getHighRatedBooks = (minRating: number = 4, limit: number = 10): Promise<Book[]> => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM books WHERE rating >= ? AND is_available = 1
       ORDER BY rating DESC, reviews_count DESC LIMIT ?`,
      [minRating, limit],
      (err, rows: Book[]) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
};

/**
 * Отримати книги з високим рейтингом з пагінацією
 * @param minRating - Мінімальний рейтинг (за замовчуванням 4)
 * @param limit - Максимальна кількість книг (за замовчуванням 10)
 * @param offset - Зміщення для пагінації (за замовчуванням 0)
 * @returns Об'єкт з масивом книг та загальною кількістю
 */
export const getHighRatedBooksWithPagination = (
  minRating: number = 4,
  limit: number = 10,
  offset: number = 0
): Promise<{ books: Book[]; total: number }> => {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT COUNT(*) as total FROM books WHERE rating >= ? AND is_available = 1',
      [minRating],
      (err, countRow: CountRow | undefined) => {
        if (err) {
          reject(err);
          return;
        }

        db.all(
          'SELECT * FROM books WHERE rating >= ? AND is_available = 1 ORDER BY rating DESC, reviews_count DESC LIMIT ? OFFSET ?',
          [minRating, limit, offset],
          (err, rows: Book[]) => {
            if (err) reject(err);
            else resolve({ books: rows, total: countRow?.total || 0 });
          }
        );
      }
    );
  });
};

/**
 * Отримати нові книги з пагінацією
 * @param limit - Максимальна кількість книг (за замовчуванням 10)
 * @param offset - Зміщення для пагінації (за замовчуванням 0)
 * @returns Об'єкт з масивом книг та загальною кількістю
 */
export const getNewestBooksWithPagination = (
  limit: number = 10,
  offset: number = 0
): Promise<{ books: Book[]; total: number }> => {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT COUNT(*) as total FROM books WHERE is_available = 1',
      [],
      (err, countRow: CountRow | undefined) => {
        if (err) {
          reject(err);
          return;
        }

        db.all(
          'SELECT * FROM books WHERE is_available = 1 ORDER BY created_at DESC LIMIT ? OFFSET ?',
          [limit, offset],
          (err, rows: Book[]) => {
            if (err) reject(err);
            else resolve({ books: rows, total: countRow?.total || 0 });
          }
        );
      }
    );
  });
};

/**
 * Отримати книги з аудіо з пагінацією
 * @param limit - Максимальна кількість книг (за замовчуванням 10)
 * @param offset - Зміщення для пагінації (за замовчуванням 0)
 * @returns Об'єкт з масивом книг та загальною кількістю
 */
export const getBooksWithAudioWithPagination = (
  limit: number = 10,
  offset: number = 0
): Promise<{ books: Book[]; total: number }> => {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT COUNT(*) as total FROM books WHERE (
        audio_file_id IS NOT NULL 
        OR audio_external_link IS NOT NULL 
        OR file_type = 'audio'
      ) AND is_available = 1`,
      [],
      (err, countRow: CountRow | undefined) => {
        if (err) {
          reject(err);
          return;
        }

        db.all(
          `SELECT * FROM books WHERE (
            audio_file_id IS NOT NULL 
            OR audio_external_link IS NOT NULL 
            OR file_type = 'audio'
          ) AND is_available = 1 ORDER BY created_at DESC LIMIT ? OFFSET ?`,
          [limit, offset],
          (err, rows: Book[]) => {
            if (err) reject(err);
            else resolve({ books: rows, total: countRow?.total || 0 });
          }
        );
      }
    );
  });
};

/**
 * Отримати популярні книги з пагінацією (за завантаженнями)
 */
export const getMostDownloadedBooks = (limit: number = 10): Promise<Book[]> => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT * FROM books 
      WHERE downloads_count IS NOT NULL AND downloads_count > 0 
      ORDER BY downloads_count DESC 
      LIMIT ?
    `;

    db.all(query, [limit], (err, rows: Book[]) => {
      if (err) {
        logger.error('Error getting most downloaded books', err, { limit });
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
};

/**
 * Отримати популярні книги з пагінацією (за завантаженнями)
 * @param limit - Максимальна кількість книг (за замовчуванням 10)
 * @param offset - Зміщення для пагінації (за замовчуванням 0)
 * @returns Об'єкт з масивом книг та загальною кількістю
 */
export const getMostDownloadedBooksWithPagination = (
  limit: number = 10,
  offset: number = 0
): Promise<{ books: Book[]; total: number }> => {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT COUNT(*) as total FROM books WHERE is_available = 1',
      [],
      (err, countRow: CountRow | undefined) => {
        if (err) {
          reject(err);
          return;
        }

        db.all(
          'SELECT * FROM books WHERE is_available = 1 ORDER BY downloads_count DESC, created_at DESC LIMIT ? OFFSET ?',
          [limit, offset],
          (err, rows: Book[]) => {
            if (err) reject(err);
            else resolve({ books: rows, total: countRow?.total || 0 });
          }
        );
      }
    );
  });
};

/**
 * Отримати книги за алфавітом
 * @param limit - Максимальна кількість книг (за замовчуванням 10)
 * @param offset - Зміщення для пагінації (за замовчуванням 0)
 * @returns Об'єкт з масивом книг та загальною кількістю
 */
export const getBooksSortedByTitle = (
  limit: number = 10,
  offset: number = 0
): Promise<{ books: Book[]; total: number }> => {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT COUNT(*) as total FROM books WHERE is_available = 1',
      [],
      (err, countRow: CountRow | undefined) => {
        if (err) {
          reject(err);
          return;
        }

        db.all(
          'SELECT * FROM books WHERE is_available = 1 ORDER BY title ASC LIMIT ? OFFSET ?',
          [limit, offset],
          (err, rows: Book[]) => {
            if (err) reject(err);
            else resolve({ books: rows || [], total: countRow?.total || 0 });
          }
        );
      }
    );
  });
};
