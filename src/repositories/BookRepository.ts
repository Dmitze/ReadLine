import { DatabaseWrapper } from '../database/dbWrapper';
import { BaseRepository } from './BaseRepository';
import { Book } from '../database/models';
import { logger } from '../utils/logger';

export class BookRepository extends BaseRepository<Book> {
  constructor(db: DatabaseWrapper) {
    super(db, 'books');
  }

  async create(book: Omit<Book, 'id' | 'created_at'>): Promise<number> {
    try {
      const {
        title,
        author,
        genre,
        description,
        photo_file_id,
        file_url,
        audio_file_id,
        online_link,
        file_type,
        file_name,
      } = book;

      const query = `
        INSERT INTO books (
          title, author, genre, description, photo_file_id,
          file_url, audio_file_id, online_link, file_type, file_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const bookId = await this.db.insert(query, [
        title,
        author,
        genre,
        description,
        photo_file_id,
        file_url || null,
        audio_file_id || null,
        online_link || null,
        file_type || 'physical',
        file_name || null,
      ]);

      logger.info(`Book created: ${title}`, { bookId });
      return bookId;
    } catch (error) {
      logger.error(
        'Error creating book',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  async update(bookId: number, updates: Partial<Omit<Book, 'id' | 'created_at'>>): Promise<number> {
    try {
      if (Object.keys(updates).length === 0) {
        return 0;
      }

      const allowedFields = [
        'title',
        'author',
        'genre',
        'description',
        'photo_file_id',
        'file_url',
        'audio_file_id',
        'online_link',
        'file_type',
        'file_name',
        'rating',
        'reviews_count',
        'downloads_count',
        'is_available',
        'is_physically_available',
      ];

      const validUpdates: Record<string, any> = {};
      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          validUpdates[key] = value;
        }
      }

      if (Object.keys(validUpdates).length === 0) {
        return 0;
      }

      const fields = Object.keys(validUpdates)
        .map((key) => `"${key}" = ?`)
        .join(', ');
      const values = Object.values(validUpdates);

      const query = `UPDATE books SET ${fields} WHERE id = ?`;
      const changes = await this.db.update(query, [...values, bookId]);

      if (changes > 0) {
        logger.info(`Book updated: ${bookId}`, { changes });
      }
      return changes;
    } catch (error) {
      logger.error(
        'Error updating book',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  async getByGenre(genre: string): Promise<Book[]> {
    try {
      const query = 'SELECT * FROM books WHERE genre = ? ORDER BY rating DESC';
      return await this.db.all<Book>(query, [genre]);
    } catch (error) {
      logger.error(
        'Error getting books by genre',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  async getByGenreWithPagination(
    genre: string,
    limit: number = 5,
    offset: number = 0
  ): Promise<{ books: Book[]; total: number }> {
    try {
      const totalQuery = 'SELECT COUNT(*) as total FROM books WHERE genre = ?';
      const totalResult = await this.db.get<{ total: number }>(totalQuery, [genre]);
      const total = totalResult?.total || 0;

      const booksQuery =
        'SELECT * FROM books WHERE genre = ? ORDER BY rating DESC LIMIT ? OFFSET ?';
      const books = await this.db.all<Book>(booksQuery, [genre, limit, offset]);

      return { books, total };
    } catch (error) {
      logger.error(
        'Error getting books by genre with pagination',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  async getAllWithPagination(
    limit: number = 5,
    offset: number = 0
  ): Promise<{ books: Book[]; total: number }> {
    try {
      const totalQuery = 'SELECT COUNT(*) as total FROM books';
      const totalResult = await this.db.get<{ total: number }>(totalQuery, []);
      const total = totalResult?.total || 0;

      const booksQuery = 'SELECT * FROM books LIMIT ? OFFSET ?';
      const books = await this.db.all<Book>(booksQuery, [limit, offset]);

      return { books, total };
    } catch (error) {
      logger.error(
        'Error getting all books with pagination',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  async search(searchTerm: string, limit: number = 10): Promise<Book[]> {
    try {
      const pattern = `%${searchTerm}%`;
      const query = `
        SELECT * FROM books
        WHERE title LIKE ? COLLATE NOCASE
           OR author LIKE ? COLLATE NOCASE
           OR genre LIKE ? COLLATE NOCASE
        ORDER BY rating DESC
        LIMIT ?
      `;

      return await this.db.all<Book>(query, [pattern, pattern, pattern, limit]);
    } catch (error) {
      logger.error(
        'Error searching books',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  async getTopRated(limit: number = 10): Promise<Book[]> {
    try {
      const query = `
        SELECT * FROM books 
        WHERE is_available = 1
        ORDER BY rating DESC, reviews_count DESC
        LIMIT ?
      `;
      return await this.db.all<Book>(query, [limit]);
    } catch (error) {
      logger.error(
        'Error getting top rated books',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  async getNewest(limit: number = 10): Promise<Book[]> {
    try {
      const query = `
        SELECT * FROM books 
        WHERE is_available = 1
        ORDER BY created_at DESC
        LIMIT ?
      `;
      return await this.db.all<Book>(query, [limit]);
    } catch (error) {
      logger.error(
        'Error getting newest books',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  async getRandom(): Promise<Book | undefined> {
    try {
      const query = `
        SELECT * FROM books 
        WHERE is_available = 1
        ORDER BY RANDOM()
        LIMIT 1
      `;
      return await this.db.get<Book>(query, []);
    } catch (error) {
      logger.error(
        'Error getting random book',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  async getAllGenres(): Promise<string[]> {
    try {
      const query = `
        SELECT DISTINCT genre FROM books 
        WHERE is_available = 1
        ORDER BY genre ASC
      `;
      const results = await this.db.all<{ genre: string }>(query, []);
      return results.map((r) => r.genre);
    } catch (error) {
      logger.error(
        'Error getting all genres',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  async incrementDownloads(bookId: number): Promise<void> {
    try {
      const query = 'UPDATE books SET downloads_count = downloads_count + 1 WHERE id = ?';
      await this.db.update(query, [bookId]);
    } catch (error) {
      logger.error(
        'Error incrementing downloads',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  async getLowRatedBooks(maxRating: number = 2, limit: number = 20): Promise<Book[]> {
    try {
      const query = `
        SELECT * FROM books 
        WHERE rating <= ? AND reviews_count >= 3
        ORDER BY rating ASC, reviews_count DESC
        LIMIT ?
      `;
      return await this.db.all<Book>(query, [maxRating, limit]);
    } catch (error) {
      logger.error(
        'Error getting low rated books',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  async getByAuthor(author: string, limit?: number): Promise<Book[]> {
    try {
      let query = `
        SELECT * FROM books
        WHERE author = ? COLLATE NOCASE
        ORDER BY rating DESC
      `;
      const params: any[] = [author];

      if (limit !== undefined) {
        query += ' LIMIT ?';
        params.push(limit);
      }

      return await this.db.all<Book>(query, params);
    } catch (error) {
      logger.error(
        'Error getting books by author',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  async findByQuery(searchTerm: string, limit?: number): Promise<Book[]> {
    return this.search(searchTerm, limit || 10);
  }

  async findMostRated(limit?: number): Promise<Book[]> {
    return this.getTopRated(limit || 10);
  }

  async findNewest(limit?: number): Promise<Book[]> {
    return this.getNewest(limit || 10);
  }

  async findByGenre(genre: string): Promise<Book[]> {
    return this.getByGenre(genre);
  }
}
