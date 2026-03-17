/**
 * SQL Query Builder with Parameterized Queries
 * REFACTOR-016: SQL Injection Protection
 */

export type WhereOperator =
  | '='
  | '!='
  | '<'
  | '<='
  | '>'
  | '>='
  | 'LIKE'
  | 'IN'
  | 'NOT IN'
  | 'BETWEEN';
export type JoinType = 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
export type OrderDirection = 'ASC' | 'DESC';

export interface WhereCondition {
  column: string;
  operator: WhereOperator;
  value: any;
  logic?: 'AND' | 'OR';
}

export interface JoinClause {
  type: JoinType;
  table: string;
  on: string;
}

export interface OrderClause {
  column: string;
  direction: OrderDirection;
}

export class QueryBuilder {
  private select: string[] = ['*'];
  private fromTable: string = '';
  private joins: JoinClause[] = [];
  private whereConditions: WhereCondition[] = [];
  private groupByColumns: string[] = [];
  private havingConditions: WhereCondition[] = [];
  private orderByClauses: OrderClause[] = [];
  private limitValue: number | null = null;
  private offsetValue: number | null = null;
  private parameters: any[] = [];

  /**
   * Встановити таблицю
   */
  from(table: string): this {
    this.fromTable = this.escapeIdentifier(table);
    return this;
  }

  /**
   * Встановити стовпці для виділення
   */
  columns(...columns: string[]): this {
    this.select = columns.map((col) => this.escapeIdentifier(col));
    return this;
  }

  /**
   * Додати JOIN
   */
  join(table: string, condition: string, type: JoinType = 'INNER'): this {
    this.joins.push({
      type,
      table: this.escapeIdentifier(table),
      on: condition,
    });
    return this;
  }

  /**
   * Додати LEFT JOIN
   */
  leftJoin(table: string, condition: string): this {
    return this.join(table, condition, 'LEFT');
  }

  /**
   * Додати RIGHT JOIN
   */
  rightJoin(table: string, condition: string): this {
    return this.join(table, condition, 'RIGHT');
  }

  /**
   * Додати WHERE умову
   */
  where(column: string, operator: WhereOperator | string, value?: any): this {
    // Якщо переданий тільки стовпець та значення (за замовчуванням =)
    if (value === undefined) {
      value = operator;
      operator = '=';
    }

    this.whereConditions.push({
      column: this.escapeIdentifier(column),
      operator: operator as WhereOperator,
      value,
    });

    this.parameters.push(value);
    return this;
  }

  /**
   * Додати AND умову
   */
  and(column: string, operator: WhereOperator | string, value?: any): this {
    if (value === undefined) {
      value = operator;
      operator = '=';
    }

    this.whereConditions.push({
      column: this.escapeIdentifier(column),
      operator: operator as WhereOperator,
      value,
      logic: 'AND',
    });

    this.parameters.push(value);
    return this;
  }

  /**
   * Додати OR умову
   */
  or(column: string, operator: WhereOperator | string, value?: any): this {
    if (value === undefined) {
      value = operator;
      operator = '=';
    }

    this.whereConditions.push({
      column: this.escapeIdentifier(column),
      operator: operator as WhereOperator,
      value,
      logic: 'OR',
    });

    this.parameters.push(value);
    return this;
  }

  /**
   * Додати WHERE IN умову
   */
  whereIn(column: string, values: any[]): this {
    if (values.length === 0) {
      // Empty IN () is invalid SQL — add a condition that always returns false
      this.whereConditions.push({
        column: '1',
        operator: '=',
        value: 0,
      });
      this.parameters.push(0);
      return this;
    }

    this.whereConditions.push({
      column: this.escapeIdentifier(column),
      operator: 'IN',
      value: values,
    });

    this.parameters.push(...values);
    return this;
  }

  /**
   * Додати WHERE BETWEEN умову
   */
  whereBetween(column: string, min: any, max: any): this {
    this.whereConditions.push({
      column: this.escapeIdentifier(column),
      operator: 'BETWEEN',
      value: [min, max],
    });

    this.parameters.push(min, max);
    return this;
  }

  /**
   * Додати GROUP BY
   */
  groupBy(...columns: string[]): this {
    this.groupByColumns = columns.map((col) => this.escapeIdentifier(col));
    return this;
  }

  /**
   * Додати ORDER BY
   */
  orderBy(column: string, direction: OrderDirection = 'ASC'): this {
    this.orderByClauses.push({
      column: this.escapeIdentifier(column),
      direction,
    });
    return this;
  }

  /**
   * Встановити LIMIT
   */
  limit(value: number): this {
    this.limitValue = Math.max(0, Math.floor(value));
    return this;
  }

  /**
   * Встановити OFFSET
   */
  offset(value: number): this {
    this.offsetValue = Math.max(0, Math.floor(value));
    return this;
  }

  /**
   * Отримати SQL запит
   */
  toSql(): string {
    let sql = `SELECT ${this.select.join(', ')} FROM ${this.fromTable}`;

    // Додати JOIN
    for (const join of this.joins) {
      sql += ` ${join.type} JOIN ${join.table} ON ${join.on}`;
    }

    // Додати WHERE
    if (this.whereConditions.length > 0) {
      const conditions = this.buildWhereConditions();
      sql += ` WHERE ${conditions}`;
    }

    // Додати GROUP BY
    if (this.groupByColumns.length > 0) {
      sql += ` GROUP BY ${this.groupByColumns.join(', ')}`;
    }

    // Додати ORDER BY
    if (this.orderByClauses.length > 0) {
      const orderClauses = this.orderByClauses.map((o) => `${o.column} ${o.direction}`).join(', ');
      sql += ` ORDER BY ${orderClauses}`;
    }

    // Додати LIMIT і OFFSET
    if (this.limitValue !== null) {
      sql += ` LIMIT ${this.limitValue}`;
    }
    if (this.offsetValue !== null) {
      sql += ` OFFSET ${this.offsetValue}`;
    }

    return sql;
  }

  /**
   * Отримати параметри для параметризованого запиту
   */
  getParameters(): any[] {
    return this.parameters;
  }

  /**
   * Отримати параметризований запит та параметри
   */
  build(): { sql: string; parameters: any[] } {
    return {
      sql: this.toSql(),
      parameters: this.getParameters(),
    };
  }

  /**
   * Побудувати WHERE умови
   */
  private buildWhereConditions(): string {
    return this.whereConditions
      .map((condition, index) => {
        const prefix = index === 0 ? '' : (condition.logic || 'AND') + ' ';

        switch (condition.operator) {
          case 'IN':
            const placeholders = (condition.value as any[]).map(() => '?').join(', ');
            if (!placeholders) {
              // Empty array — condition always false
              return `${prefix}1 = 0`;
            }
            return `${prefix}${condition.column} IN (${placeholders})`;

          case 'BETWEEN':
            return `${prefix}${condition.column} BETWEEN ? AND ?`;

          case 'LIKE':
            return `${prefix}${condition.column} LIKE ?`;

          default:
            return `${prefix}${condition.column} ${condition.operator} ?`;
        }
      })
      .join(' ');
  }

  /**
   * Екранувати ідентифікатор (назва таблиці, стовпця)
   */
  private escapeIdentifier(identifier: string): string {
    // Дозволені символи для ідентифікаторів
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)?$/.test(identifier)) {
      throw new Error(`Invalid identifier: ${identifier}`);
    }
    return identifier;
  }

  /**
   * Скинути запит
   */
  reset(): this {
    this.select = ['*'];
    this.fromTable = '';
    this.joins = [];
    this.whereConditions = [];
    this.groupByColumns = [];
    this.havingConditions = [];
    this.orderByClauses = [];
    this.limitValue = null;
    this.offsetValue = null;
    this.parameters = [];
    return this;
  }

  /**
   * Клонувати QueryBuilder
   */
  clone(): QueryBuilder {
    const cloned = new QueryBuilder();
    cloned.select = [...this.select];
    cloned.fromTable = this.fromTable;
    cloned.joins = [...this.joins];
    cloned.whereConditions = [...this.whereConditions];
    cloned.groupByColumns = [...this.groupByColumns];
    cloned.havingConditions = [...this.havingConditions];
    cloned.orderByClauses = [...this.orderByClauses];
    cloned.limitValue = this.limitValue;
    cloned.offsetValue = this.offsetValue;
    cloned.parameters = [...this.parameters];
    return cloned;
  }
}

/**
 * Builder для INSERT запитів
 */
export class InsertBuilder {
  private tableName: string = '';
  private columnNames: string[] = [];
  private rowValues: any[][] = [];
  private parameters: any[] = [];

  /**
   * Встановити таблицю
   */
  into(table: string): this {
    this.tableName = this.escapeIdentifier(table);
    return this;
  }

  /**
   * Встановити стовпці
   */
  columns(...columns: string[]): this {
    this.columnNames = columns.map((col) => this.escapeIdentifier(col));
    return this;
  }

  /**
   * Додати рядок значень
   */
  values(...vals: any[]): this {
    this.rowValues.push(vals);
    this.parameters.push(...vals);
    return this;
  }

  /**
   * Отримати SQL запит
   */
  toSql(): string {
    const placeholders = this.columnNames.map(() => '?').join(', ');
    const valueSets = this.rowValues.map(() => `(${placeholders})`).join(', ');
    return `INSERT INTO ${this.tableName} (${this.columnNames.join(', ')}) VALUES ${valueSets}`;
  }

  /**
   * Отримати параметри
   */
  getParameters(): any[] {
    return this.parameters;
  }

  /**
   * Побудувати запит та параметри
   */
  build(): { sql: string; parameters: any[] } {
    return {
      sql: this.toSql(),
      parameters: this.getParameters(),
    };
  }

  private escapeIdentifier(identifier: string): string {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
      throw new Error(`Invalid identifier: ${identifier}`);
    }
    return identifier;
  }
}

/**
 * Builder для UPDATE запитів
 */
export class UpdateBuilder {
  private tableName: string = '';
  private setValues: Map<string, any> = new Map();
  private whereConditions: WhereCondition[] = [];
  private parameters: any[] = [];

  /**
   * Встановити таблицю
   */
  table(table: string): this {
    this.tableName = this.escapeIdentifier(table);
    return this;
  }

  /**
   * Встановити значення
   */
  set(column: string, value: any): this {
    this.setValues.set(this.escapeIdentifier(column), value);
    this.parameters.push(value);
    return this;
  }

  /**
   * Додати WHERE умову
   */
  where(column: string, operator: WhereOperator | string, value?: any): this {
    if (value === undefined) {
      value = operator;
      operator = '=';
    }

    this.whereConditions.push({
      column: this.escapeIdentifier(column),
      operator: operator as WhereOperator,
      value,
    });

    this.parameters.push(value);
    return this;
  }

  /**
   * Отримати SQL запит
   */
  toSql(): string {
    const setClause = Array.from(this.setValues.keys())
      .map((col) => `${col} = ?`)
      .join(', ');

    let sql = `UPDATE ${this.tableName} SET ${setClause}`;

    if (this.whereConditions.length > 0) {
      const conditions = this.buildWhereConditions();
      sql += ` WHERE ${conditions}`;
    }

    return sql;
  }

  /**
   * Отримати параметри
   */
  getParameters(): any[] {
    return this.parameters;
  }

  /**
   * Побудувати запит та параметри
   */
  build(): { sql: string; parameters: any[] } {
    return {
      sql: this.toSql(),
      parameters: this.getParameters(),
    };
  }

  private buildWhereConditions(): string {
    return this.whereConditions
      .map((condition, index) => {
        const prefix = index === 0 ? '' : (condition.logic || 'AND') + ' ';
        return `${prefix}${condition.column} ${condition.operator} ?`;
      })
      .join(' ');
  }

  private escapeIdentifier(identifier: string): string {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
      throw new Error(`Invalid identifier: ${identifier}`);
    }
    return identifier;
  }
}

/**
 * Builder для DELETE запитів
 */
export class DeleteBuilder {
  private tableName: string = '';
  private whereConditions: WhereCondition[] = [];
  private parameters: any[] = [];

  /**
   * Встановити таблицю
   */
  from(table: string): this {
    this.tableName = this.escapeIdentifier(table);
    return this;
  }

  /**
   * Додати WHERE умову
   */
  where(column: string, operator: WhereOperator | string, value?: any): this {
    if (value === undefined) {
      value = operator;
      operator = '=';
    }

    this.whereConditions.push({
      column: this.escapeIdentifier(column),
      operator: operator as WhereOperator,
      value,
    });

    this.parameters.push(value);
    return this;
  }

  /**
   * Отримати SQL запит
   */
  toSql(): string {
    let sql = `DELETE FROM ${this.tableName}`;

    if (this.whereConditions.length > 0) {
      const conditions = this.buildWhereConditions();
      sql += ` WHERE ${conditions}`;
    }

    return sql;
  }

  /**
   * Отримати параметри
   */
  getParameters(): any[] {
    return this.parameters;
  }

  /**
   * Побудувати запит та параметри
   */
  build(): { sql: string; parameters: any[] } {
    return {
      sql: this.toSql(),
      parameters: this.getParameters(),
    };
  }

  private buildWhereConditions(): string {
    return this.whereConditions
      .map((condition, index) => {
        const prefix = index === 0 ? '' : (condition.logic || 'AND') + ' ';
        return `${prefix}${condition.column} ${condition.operator} ?`;
      })
      .join(' ');
  }

  private escapeIdentifier(identifier: string): string {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
      throw new Error(`Invalid identifier: ${identifier}`);
    }
    return identifier;
  }
}
