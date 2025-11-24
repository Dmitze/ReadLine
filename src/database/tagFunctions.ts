import { db } from './models';

export interface Tag {
  id: number;
  name: string;
  created_at?: string;
}

export interface BookTag {
  book_id: number;
  tag_id: number;
  created_at?: string;
}

// Отримати всі теги
export const getAllTags = (): Promise<Tag[]> => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM tags ORDER BY name', (err, rows: Tag[]) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Додати новий тег
// ВАЖЛИВО: теги повинні бути однослівними (максимум 2 слова без пробілів)
export const addTag = async (name: string): Promise<number> => {
  const { isValidTag, normalizeTag } = await import('../utils/tagValidator');

  if (!isValidTag(name)) {
    throw new Error(
      `Невалідна назва тегу: "${name}". Теги мають бути однослівними або двослівними без пробілів.`
    );
  }

  const normalized = normalizeTag(name);

  return new Promise((resolve, reject) => {
    db.run('INSERT INTO tags (name) VALUES (?)', [normalized], function (err) {
      if (err) reject(err);
      else {
        // ✅ Інвалідація кеша тегів після додавання нового тегу
        const { invalidateTagsCache } = require('../scenes/addBook/utils');
        invalidateTagsCache();
        resolve(this.lastID);
      }
    });
  });
};

// Отримати теги книги
export const getBookTags = (bookId: number): Promise<Tag[]> => {
  return new Promise((resolve, reject) => {
    const query =
      'SELECT t.* FROM tags t INNER JOIN book_tags bt ON t.id = bt.tag_id WHERE bt.book_id = ? ORDER BY t.name';
    db.all(query, [bookId], (err, rows: Tag[]) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Batch версія - отримати теги для багатьох книг одразу (N+1 fix)
export const getBooksTagsBatch = (bookIds: number[]): Promise<Map<number, Tag[]>> => {
  return new Promise((resolve, reject) => {
    if (bookIds.length === 0) {
      resolve(new Map());
      return;
    }

    const placeholders = bookIds.map(() => '?').join(',');
    const query = `
      SELECT bt.book_id, t.* 
      FROM tags t 
      INNER JOIN book_tags bt ON t.id = bt.tag_id 
      WHERE bt.book_id IN (${placeholders})
      ORDER BY bt.book_id, t.name
    `;

    db.all(query, bookIds, (err, rows: Array<Tag & { book_id: number }>) => {
      if (err) {
        reject(err);
        return;
      }

      const result = new Map<number, Tag[]>();
      rows.forEach((row) => {
        const bookId = row.book_id;
        if (!result.has(bookId)) {
          result.set(bookId, []);
        }
        const { book_id, ...tag } = row;
        result.get(bookId)!.push(tag);
      });

      resolve(result);
    });
  });
};

// Додати тег до книги
export const addBookTag = (bookId: number, tagId: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT OR IGNORE INTO book_tags (book_id, tag_id) VALUES (?, ?)',
      [bookId, tagId],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
};

// Видалити тег з книги
export const removeBookTag = (bookId: number, tagId: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM book_tags WHERE book_id = ? AND tag_id = ?', [bookId, tagId], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

// Пошук книг за тегом
// ✅ ВИПРАВЛЕНО #16: використовуємо sanitization utility
export const searchBooksByTag = (tagName: string, limit: number = 10): Promise<any[]> => {
  return new Promise(async (resolve, reject) => {
    const { sanitizeTag } = await import('../utils/sanitization');
    const sanitizedTagName = sanitizeTag(tagName);

    if (!sanitizedTagName || sanitizedTagName.length < 2) {
      resolve([]);
      return;
    }

    const query = `SELECT DISTINCT b.* FROM books b
      INNER JOIN book_tags bt ON b.id = bt.book_id
      INNER JOIN tags t ON bt.tag_id = t.id
      WHERE t.name LIKE ? AND b.is_available = 1
      ORDER BY b.rating DESC, b.downloads_count DESC LIMIT ?`;
    db.all(query, [`%${sanitizedTagName}%`, limit], (err, rows: any[]) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Пошук книг за тегом з пагінацією
export const searchBooksByTagWithPagination = (
  tagName: string,
  limit: number = 10,
  offset: number = 0
): Promise<{ books: any[]; total: number }> => {
  return new Promise(async (resolve, reject) => {
    const { sanitizeTag } = await import('../utils/sanitization');
    const sanitizedTagName = sanitizeTag(tagName);

    if (!sanitizedTagName || sanitizedTagName.length < 2) {
      resolve({ books: [], total: 0 });
      return;
    }

    const countQuery = `SELECT COUNT(DISTINCT b.id) as total FROM books b
      INNER JOIN book_tags bt ON b.id = bt.book_id
      INNER JOIN tags t ON bt.tag_id = t.id
      WHERE t.name LIKE ? AND b.is_available = 1`;

    const dataQuery = `SELECT DISTINCT b.* FROM books b
      INNER JOIN book_tags bt ON b.id = bt.book_id
      INNER JOIN tags t ON bt.tag_id = t.id
      WHERE t.name LIKE ? AND b.is_available = 1
      ORDER BY b.rating DESC, b.downloads_count DESC LIMIT ? OFFSET ?`;

    const sanitizedParam = `%${sanitizedTagName}%`;

    db.get(countQuery, [sanitizedParam], (err, countRow: any) => {
      if (err) {
        reject(err);
        return;
      }

      db.all(dataQuery, [sanitizedParam, limit, offset], (err, rows: any[]) => {
        if (err) reject(err);
        else resolve({ books: rows || [], total: countRow?.total || 0 });
      });
    });
  });
};

// Отримати популярні теги
export const getPopularTags = (limit: number = 10): Promise<Array<Tag & { count: number }>> => {
  return new Promise((resolve, reject) => {
    const query = `SELECT t.*, COUNT(bt.book_id) as count FROM tags t
      LEFT JOIN book_tags bt ON t.id = bt.tag_id GROUP BY t.id ORDER BY count DESC, t.name LIMIT ?`;
    db.all(query, [limit], (err, rows: Array<Tag & { count: number }>) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};
