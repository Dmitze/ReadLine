export class MockDatabase {
  private tables: Map<string, any[]> = new Map();
  private lastInsertId = 0;

  constructor() {
    this.initializeTables();
  }

  private initializeTables(): void {
    const tableNames = [
      'books',
      'users',
      'reviews',
      'saved_books',
      'audio_books',
      'tags',
      'feedback',
      'promo_codes',
    ];

    tableNames.forEach((name) => {
      this.tables.set(name, []);
    });
  }

  async insert(table: string, data: Record<string, any>): Promise<number> {
    if (!this.tables.has(table)) {
      throw new Error(`Table ${table} does not exist`);
    }

    this.lastInsertId++;
    const row = { id: this.lastInsertId, ...data };
    this.tables.get(table)!.push(row);
    return this.lastInsertId;
  }

  async get(table: string, where: Record<string, any>): Promise<any | null> {
    const rows = this.tables.get(table) || [];
    return rows.find((row) => this.matchesWhere(row, where)) || null;
  }

  async all(table: string, where?: Record<string, any>): Promise<any[]> {
    const rows = this.tables.get(table) || [];

    if (!where) {
      return [...rows];
    }

    return rows.filter((row) => this.matchesWhere(row, where));
  }

  async update(
    table: string,
    data: Record<string, any>,
    where: Record<string, any>
  ): Promise<number> {
    const rows = this.tables.get(table) || [];
    let count = 0;

    for (const row of rows) {
      if (this.matchesWhere(row, where)) {
        Object.assign(row, data);
        count++;
      }
    }

    return count;
  }

  async delete(table: string, where: Record<string, any>): Promise<number> {
    const rows = this.tables.get(table) || [];
    const beforeLength = rows.length;

    const filtered = rows.filter((row) => !this.matchesWhere(row, where));
    this.tables.set(table, filtered);

    return beforeLength - filtered.length;
  }

  async run(_sql: string, _params?: any[]): Promise<void> {}

  async count(table: string, where?: Record<string, any>): Promise<number> {
    const rows = await this.all(table, where);
    return rows.length;
  }

  async clearTable(table: string): Promise<void> {
    this.tables.set(table, []);
  }

  async clear(): Promise<void> {
    this.tables.forEach((_, table) => {
      this.tables.set(table, []);
    });
    this.lastInsertId = 0;
  }

  getTableData(table: string): any[] {
    return this.tables.get(table) || [];
  }

  private matchesWhere(row: any, where: Record<string, any>): boolean {
    return Object.entries(where).every(([key, value]) => {
      if (value === undefined) return true;
      return row[key] === value;
    });
  }
}

export function createMockDatabase(): MockDatabase {
  return new MockDatabase();
}
