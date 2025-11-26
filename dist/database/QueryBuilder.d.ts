export type WhereOperator = '=' | '!=' | '<' | '<=' | '>' | '>=' | 'LIKE' | 'IN' | 'NOT IN' | 'BETWEEN';
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
export declare class QueryBuilder {
    private select;
    private fromTable;
    private joins;
    private whereConditions;
    private groupByColumns;
    private havingConditions;
    private orderByClauses;
    private limitValue;
    private offsetValue;
    private parameters;
    from(table: string): this;
    columns(...columns: string[]): this;
    join(table: string, condition: string, type?: JoinType): this;
    leftJoin(table: string, condition: string): this;
    rightJoin(table: string, condition: string): this;
    where(column: string, operator: WhereOperator | string, value?: any): this;
    and(column: string, operator: WhereOperator | string, value?: any): this;
    or(column: string, operator: WhereOperator | string, value?: any): this;
    whereIn(column: string, values: any[]): this;
    whereBetween(column: string, min: any, max: any): this;
    groupBy(...columns: string[]): this;
    orderBy(column: string, direction?: OrderDirection): this;
    limit(value: number): this;
    offset(value: number): this;
    toSql(): string;
    getParameters(): any[];
    build(): {
        sql: string;
        parameters: any[];
    };
    private buildWhereConditions;
    private escapeIdentifier;
    reset(): this;
    clone(): QueryBuilder;
}
export declare class InsertBuilder {
    private tableName;
    private columnNames;
    private rowValues;
    private parameters;
    into(table: string): this;
    columns(...columns: string[]): this;
    values(...vals: any[]): this;
    toSql(): string;
    getParameters(): any[];
    build(): {
        sql: string;
        parameters: any[];
    };
    private escapeIdentifier;
}
export declare class UpdateBuilder {
    private tableName;
    private setValues;
    private whereConditions;
    private parameters;
    table(table: string): this;
    set(column: string, value: any): this;
    where(column: string, operator: WhereOperator | string, value?: any): this;
    toSql(): string;
    getParameters(): any[];
    build(): {
        sql: string;
        parameters: any[];
    };
    private buildWhereConditions;
    private escapeIdentifier;
}
export declare class DeleteBuilder {
    private tableName;
    private whereConditions;
    private parameters;
    from(table: string): this;
    where(column: string, operator: WhereOperator | string, value?: any): this;
    toSql(): string;
    getParameters(): any[];
    build(): {
        sql: string;
        parameters: any[];
    };
    private buildWhereConditions;
    private escapeIdentifier;
}
//# sourceMappingURL=QueryBuilder.d.ts.map