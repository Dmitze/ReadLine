import { BaseRepository } from './BaseRepository';

export interface Tag {
  id?: number;
  name: string;
  created_at?: string;
}

export interface BookTag {
  book_id: number;
  tag_id: number;
  created_at?: string;
}

export class TagRepository extends BaseRepository<Tag> {
  constructor(db: any) {
    super(db, 'tags');
  }

  async getAllTags(): Promise<Tag[]> {
    return this.query('SELECT * FROM tags ORDER BY name');
  }

  async createTag(name: string): Promise<number> {
    const { isValidTag, normalizeTag } = await import('../utils/tagValidator');

    if (!isValidTag(name)) {
      throw new Error(
        `Невалідна назва тегу: "${name}". Теги мають бути однослівними або двослівними без пробілів.`
      );
    }

    const normalized = normalizeTag(name);
    const tagId = await this.insert({ name: normalized });

    const { invalidateTagsCache } = await import('../scenes/addBook/utils');
    invalidateTagsCache();

    return tagId;
  }

  async getTagById(tagId: number): Promise<Tag | null> {
    const tags = await this.query<Tag>('SELECT * FROM tags WHERE id = ?', [tagId]);
    return tags[0] || null;
  }

  async getTagByName(name: string): Promise<Tag | null> {
    const tags = await this.query<Tag>('SELECT * FROM tags WHERE name = ?', [name]);
    return tags[0] || null;
  }

  async updateTag(tagId: number, updates: Partial<Tag>): Promise<number> {
    const allowedFields = ['name'];
    const validUpdates: Record<string, any> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        validUpdates[key] = value;
      }
    }

    if (Object.keys(validUpdates).length === 0) {
      return 0;
    }

    return this.update(tagId, validUpdates);
  }

  async deleteTag(tagId: number): Promise<number> {
    return this.delete(tagId);
  }

  async getBookTags(bookId: number): Promise<Tag[]> {
    const query = `
      SELECT t.* FROM tags t
      INNER JOIN book_tags bt ON t.id = bt.tag_id
      WHERE bt.book_id = ?
      ORDER BY t.name
    `;
    return this.query(query, [bookId]);
  }

  async getBooksTagsBatch(bookIds: number[]): Promise<Map<number, Tag[]>> {
    if (bookIds.length === 0) {
      return new Map();
    }

    const placeholders = bookIds.map(() => '?').join(',');
    const query = `
      SELECT bt.book_id, t.*
      FROM tags t
      INNER JOIN book_tags bt ON t.id = bt.tag_id
      WHERE bt.book_id IN (${placeholders})
      ORDER BY bt.book_id, t.name
    `;

    const results = await this.db.all<Tag & { book_id: number }>(query, bookIds);

    const tagMap = new Map<number, Tag[]>();
    results.forEach((row) => {
      const bookId = row.book_id;
      if (!tagMap.has(bookId)) {
        tagMap.set(bookId, []);
      }
      const { book_id, ...tag } = row;
      tagMap.get(bookId)!.push(tag);
    });

    return tagMap;
  }

  async addBookTag(bookId: number, tagId: number): Promise<void> {
    await this.db.run('INSERT OR IGNORE INTO book_tags (book_id, tag_id) VALUES (?, ?)', [
      bookId,
      tagId,
    ]);
  }

  async addBookTags(bookId: number, tagIds: number[]): Promise<void> {
    if (tagIds.length === 0) return;

    const placeholders = tagIds.map(() => '(?, ?)').join(', ');
    const values = tagIds.flatMap((tagId) => [bookId, tagId]);

    const query = `INSERT OR IGNORE INTO book_tags (book_id, tag_id) VALUES ${placeholders}`;
    await this.db.run(query, values);
  }

  async removeBookTag(bookId: number, tagId: number): Promise<void> {
    await this.db.run('DELETE FROM book_tags WHERE book_id = ? AND tag_id = ?', [bookId, tagId]);
  }

  async clearBookTags(bookId: number): Promise<void> {
    await this.db.run('DELETE FROM book_tags WHERE book_id = ?', [bookId]);
  }

  async searchBooksByTag(tagName: string, limit: number = 10): Promise<Array<any>> {
    if (!tagName || tagName.trim().length < 2) {
      return [];
    }

    const sanitizedTag = tagName.trim().replace(/[%_\\]/g, '\\$&');
    const query = `
      SELECT DISTINCT b.* FROM books b
      INNER JOIN book_tags bt ON b.id = bt.book_id
      INNER JOIN tags t ON bt.tag_id = t.id
      WHERE t.name LIKE ? AND b.is_available = 1
      ORDER BY b.rating DESC, b.downloads_count DESC
      LIMIT ?
    `;

    return this.db.all(query, [`%${sanitizedTag}%`, limit]);
  }

  async getPopularTags(limit: number = 10): Promise<Array<Tag & { count: number }>> {
    const query = `
      SELECT t.*, COUNT(bt.book_id) as count FROM tags t
      LEFT JOIN book_tags bt ON t.id = bt.tag_id
      GROUP BY t.id
      ORDER BY count DESC, t.name
      LIMIT ?
    `;
    return this.db.all(query, [limit]);
  }

  async getTagStats(tagId: number): Promise<{
    tagId: number;
    bookCount: number;
    lastUsed?: string;
  }> {
    const results = await this.db.all<{ count: number }>(
      'SELECT COUNT(*) as count FROM book_tags WHERE tag_id = ?',
      [tagId]
    );

    return {
      tagId,
      bookCount: results[0]?.count || 0,
      lastUsed: new Date().toISOString(),
    };
  }

  async hasBookTag(bookId: number, tagId: number): Promise<boolean> {
    const results = await this.db.all<{ count: number }>(
      'SELECT COUNT(*) as count FROM book_tags WHERE book_id = ? AND tag_id = ?',
      [bookId, tagId]
    );
    return (results[0]?.count || 0) > 0;
  }

  async getUnusedTags(): Promise<Tag[]> {
    const query = `
      SELECT t.* FROM tags t
      LEFT JOIN book_tags bt ON t.id = bt.tag_id
      WHERE bt.id IS NULL
      ORDER BY t.name
    `;
    return this.query(query);
  }

  async getBooksByTag(tagId: number, limit: number = 20): Promise<Array<any>> {
    const query = `
      SELECT DISTINCT b.* FROM books b
      INNER JOIN book_tags bt ON b.id = bt.book_id
      WHERE bt.tag_id = ? AND b.is_available = 1
      ORDER BY b.rating DESC
      LIMIT ?
    `;
    return this.db.all(query, [tagId, limit]);
  }

  async mergeTags(sourceTagId: number, targetTagId: number): Promise<void> {
    await this.db.run(
      `INSERT OR IGNORE INTO book_tags (book_id, tag_id)
       SELECT book_id, ? FROM book_tags WHERE tag_id = ?`,
      [targetTagId, sourceTagId]
    );

    await this.deleteTag(sourceTagId);
  }

  async getTagCount(): Promise<number> {
    return this.count();
  }

  async getOrCreateTag(name: string): Promise<number> {
    const { normalizeTag } = await import('../utils/tagValidator');
    const normalized = normalizeTag(name);

    const existing = await this.getTagByName(normalized);
    if (existing && existing.id) {
      return existing.id;
    }
    return this.createTag(normalized);
  }

  async findByBookId(bookId: number): Promise<Tag[]> {
    return this.getBookTags(bookId);
  }

  async addTagToBook(bookId: number, tagId: number): Promise<void> {
    return this.addBookTag(bookId, tagId);
  }

  async deleteByBookId(bookId: number): Promise<number> {
    await this.clearBookTags(bookId);
    return 1;
  }
}
