import { BaseRepository } from './BaseRepository';

/**
 * Tag entity interface
 */
export interface Tag {
  id?: number;
  name: string;
  created_at?: string;
}

/**
 * BookTag junction table interface
 */
export interface BookTag {
  book_id: number;
  tag_id: number;
  created_at?: string;
}

/**
 * TagRepository - Manages tags and book-tag associations
 * Handles tag creation, management, and tag-based book filtering
 */
export class TagRepository extends BaseRepository<Tag> {
  /**
   * Creates instance of TagRepository
   * @param db DatabaseWrapper instance
   */
  constructor(db: any) {
    super(db, 'tags');
  }

  /**
   * Get all tags ordered by name
   * @returns Promise with Tag array
   */
  async getAllTags(): Promise<Tag[]> {
    return this.query('SELECT * FROM tags ORDER BY name');
  }

  /**
   * Create a new tag
   * @param name Tag name
   * @returns Promise with tag ID
   */
  async createTag(name: string): Promise<number> {
    return this.insert({ name });
  }

  /**
   * Get tag by ID
   * @param tagId Tag ID
   * @returns Promise with Tag or null
   */
  async getTagById(tagId: number): Promise<Tag | null> {
    const tags = await this.query<Tag>('SELECT * FROM tags WHERE id = ?', [tagId]);
    return tags[0] || null;
  }

  /**
   * Get tag by name
   * @param name Tag name
   * @returns Promise with Tag or null
   */
  async getTagByName(name: string): Promise<Tag | null> {
    const tags = await this.query<Tag>('SELECT * FROM tags WHERE name = ?', [name]);
    return tags[0] || null;
  }

  /**
   * Update a tag
   * @param tagId Tag ID
   * @param updates Partial tag data
   * @returns Promise with number of affected rows
   */
  async updateTag(tagId: number, updates: Partial<Tag>): Promise<number> {
    return this.update(tagId, updates);
  }

  /**
   * Delete a tag
   * @param tagId Tag ID
   * @returns Promise with number of deleted rows
   */
  async deleteTag(tagId: number): Promise<number> {
    return this.delete(tagId);
  }

  /**
   * Get all tags for a specific book
   * @param bookId Book ID
   * @returns Promise with Tag array
   */
  async getBookTags(bookId: number): Promise<Tag[]> {
    const query = `
      SELECT t.* FROM tags t
      INNER JOIN book_tags bt ON t.id = bt.tag_id
      WHERE bt.book_id = ?
      ORDER BY t.name
    `;
    return this.query(query, [bookId]);
  }

  /**
   * Get tags for multiple books in one query (N+1 fix)
   * @param bookIds Array of book IDs
   * @returns Promise with Map<bookId, Tag[]>
   */
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

  /**
   * Add a tag to a book
   * @param bookId Book ID
   * @param tagId Tag ID
   * @returns Promise<void>
   */
  async addBookTag(bookId: number, tagId: number): Promise<void> {
    await this.db.run(
      'INSERT OR IGNORE INTO book_tags (book_id, tag_id) VALUES (?, ?)',
      [bookId, tagId]
    );
  }

  /**
   * Add multiple tags to a book
   * @param bookId Book ID
   * @param tagIds Array of tag IDs
   * @returns Promise<void>
   */
  async addBookTags(bookId: number, tagIds: number[]): Promise<void> {
    for (const tagId of tagIds) {
      await this.addBookTag(bookId, tagId);
    }
  }

  /**
   * Remove a tag from a book
   * @param bookId Book ID
   * @param tagId Tag ID
   * @returns Promise<void>
   */
  async removeBookTag(bookId: number, tagId: number): Promise<void> {
    await this.db.run(
      'DELETE FROM book_tags WHERE book_id = ? AND tag_id = ?',
      [bookId, tagId]
    );
  }

  /**
   * Remove all tags from a book
   * @param bookId Book ID
   * @returns Promise<void>
   */
  async clearBookTags(bookId: number): Promise<void> {
    await this.db.run(
      'DELETE FROM book_tags WHERE book_id = ?',
      [bookId]
    );
  }

  /**
   * Search books by tag name
   * @param tagName Tag name (supports partial matching)
   * @param limit Maximum number of results
   * @returns Promise with books matching the tag
   */
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

  /**
   * Get popular tags with book count
   * @param limit Maximum number of results
   * @returns Promise with tags and their usage count
   */
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

  /**
   * Get tag usage statistics
   * @param tagId Tag ID
   * @returns Promise with tag usage stats
   */
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
      lastUsed: new Date().toISOString()
    };
  }

  /**
   * Check if a book has a specific tag
   * @param bookId Book ID
   * @param tagId Tag ID
   * @returns Promise with boolean
   */
  async hasBookTag(bookId: number, tagId: number): Promise<boolean> {
    const results = await this.db.all<{ count: number }>(
      'SELECT COUNT(*) as count FROM book_tags WHERE book_id = ? AND tag_id = ?',
      [bookId, tagId]
    );
    return (results[0]?.count || 0) > 0;
  }

  /**
   * Get unused tags (with no books)
   * @returns Promise with Tag array
   */
  async getUnusedTags(): Promise<Tag[]> {
    const query = `
      SELECT t.* FROM tags t
      LEFT JOIN book_tags bt ON t.id = bt.tag_id
      WHERE bt.id IS NULL
      ORDER BY t.name
    `;
    return this.query(query);
  }

  /**
   * Get all books with a specific tag
   * @param tagId Tag ID
   * @param limit Maximum number of results
   * @returns Promise with books
   */
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

  /**
   * Merge two tags (combine all books from sourceTag to targetTag)
   * @param sourceTagId Tag ID to merge from
   * @param targetTagId Tag ID to merge to
   * @returns Promise<void>
   */
  async mergeTags(sourceTagId: number, targetTagId: number): Promise<void> {
    await this.db.run(
      `INSERT OR IGNORE INTO book_tags (book_id, tag_id)
       SELECT book_id, ? FROM book_tags WHERE tag_id = ?`,
      [targetTagId, sourceTagId]
    );
    
    // Delete the source tag
    await this.deleteTag(sourceTagId);
  }

  /**
   * Get tag count
   * @returns Promise with total tag count
   */
  async getTagCount(): Promise<number> {
    return this.count();
  }

  /**
   * Create tag if not exists
   * @param name Tag name
   * @returns Promise with tag ID
   */
  async getOrCreateTag(name: string): Promise<number> {
    const existing = await this.getTagByName(name);
    if (existing && existing.id) {
      return existing.id;
    }
    return this.createTag(name);
  }

  /**
   * Aliases for compatibility with services
   */
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
