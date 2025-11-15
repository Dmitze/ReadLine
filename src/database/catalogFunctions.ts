import { db, Book } from './models';

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

// Отримати книги з фільтрами та сортуванням
export const getBooksWithFilters = (filters: CatalogFilters): Promise<{ books: Book[], total: number }> => {
  return new Promise((resolve, reject) => {
    let query = 'SELECT * FROM books WHERE is_available = 1';
    const params: SQLParameters = [];
    
    if (filters.genre) {
      query += ' AND genre = ?';
      params.push(filters.genre);
    }
    
    if (filters.hasAudio) {
      query += ' AND (audio_file_id IS NOT NULL OR audio_external_link IS NOT NULL)';
    }
    
    if (filters.minRating !== undefined) {
      query += ' AND rating >= ?';
      params.push(filters.minRating);
    }
    
    const sortBy = filters.sortBy || 'date';
    const sortOrder = filters.sortOrder || 'desc';
    
    switch (sortBy) {
      case 'rating':
        query += ' ORDER BY rating ' + sortOrder.toUpperCase() + ', reviews_count DESC';
        break;
      case 'date':
        query += ' ORDER BY created_at ' + sortOrder.toUpperCase();
        break;
      case 'title':
        query += ' ORDER BY title ' + sortOrder.toUpperCase();
        break;
      case 'downloads':
        query += ' ORDER BY downloads_count ' + sortOrder.toUpperCase();
        break;
      default:
        query += ' ORDER BY created_at DESC';
    }
    
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    
    db.get(countQuery, params, (err, countRow: CountRow | undefined) => {
      if (err) {
        reject(err);
        return;
      }
      
      const limit = filters.limit || 10;
      const offset = filters.offset || 0;
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);
      
      db.all(query, params, (err, rows: Book[]) => {
        if (err) reject(err);
        else resolve({ books: rows, total: countRow?.total || 0 });
      });
    });
  });
};

// Отримати книги з аудіо
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

// Отримати книги за алфавітом
export const getBooksSortedByTitle = (limit: number = 10, offset: number = 0): Promise<{ books: Book[], total: number }> => {
  return new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) as total FROM books WHERE is_available = 1', [], (err, countRow: CountRow | undefined) => {
      if (err) {
        reject(err);
        return;
      }
      
      db.all(
        'SELECT * FROM books WHERE is_available = 1 ORDER BY title ASC LIMIT ? OFFSET ?',
        [limit, offset],
        (err, rows: Book[]) => {
          if (err) reject(err);
          else resolve({ books: rows, total: countRow.total });
        }
      );
    });
  });
};
