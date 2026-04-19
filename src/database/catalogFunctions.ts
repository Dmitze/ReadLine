import { db, Book } from './models';
import { safeParseFloat } from '../utils/helpers';
import { QueryBuilder } from './QueryBuilder';
import { logger } from '../utils/logger';

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

export const getBooksWithFilters = async (
  filters: CatalogFilters
): Promise<{ books: Book[]; total: number }> => {
  const qb = new QueryBuilder().from('books').where('is_available', '=', 1);

  if (filters.genre) {
    qb.where('genre', '=', filters.genre);
  }

  if (filters.hasAudio) {
    qb.where('audio_file_id', 'IS NOT NULL').or('audio_external_link', 'IS NOT NULL');
  }

  if (filters.minRating !== undefined) {
    const safeMinRating = safeParseFloat(filters.minRating, 0);
    if (safeMinRating >= 0 && safeMinRating <= 5) {
      qb.where('rating', '>=', safeMinRating);
    }
  }

  const sortBy = filters.sortBy || 'date';
  const sortOrder = (filters.sortOrder || 'desc').toUpperCase() as 'ASC' | 'DESC';

  switch (sortBy) {
    case 'rating':
      qb.orderBy('rating', sortOrder).orderBy('reviews_count', 'DESC');
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
  const dataQuery = qb.limit(filters.limit || 10).offset(filters.offset || 0);

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
    }),
  ]);

  return { books, total: totalResult?.total || 0 };
};

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

export const getTopBooksWithPagination = (
  limit: number = 10,
  offset: number = 0
): Promise<{ books: Book[]; total: number }> => {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT COUNT(*) as total FROM books WHERE rating IS NOT NULL AND rating > 0',
      [],
      (err, countRow: CountRow | undefined) => {
        if (err) {
          reject(err);
          return;
        }

        db.all(
          'SELECT * FROM books WHERE rating IS NOT NULL AND rating > 0 ORDER BY rating DESC, reviews_count DESC LIMIT ? OFFSET ?',
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
