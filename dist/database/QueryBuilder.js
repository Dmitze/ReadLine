"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteBuilder = exports.UpdateBuilder = exports.InsertBuilder = exports.QueryBuilder = void 0;
class QueryBuilder {
    constructor() {
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
    }
    from(table) {
        this.fromTable = this.escapeIdentifier(table);
        return this;
    }
    columns(...columns) {
        this.select = columns.map((col) => this.escapeIdentifier(col));
        return this;
    }
    join(table, condition, type = 'INNER') {
        this.joins.push({
            type,
            table: this.escapeIdentifier(table),
            on: condition,
        });
        return this;
    }
    leftJoin(table, condition) {
        return this.join(table, condition, 'LEFT');
    }
    rightJoin(table, condition) {
        return this.join(table, condition, 'RIGHT');
    }
    where(column, operator, value) {
        if (value === undefined) {
            value = operator;
            operator = '=';
        }
        this.whereConditions.push({
            column: this.escapeIdentifier(column),
            operator: operator,
            value,
        });
        this.parameters.push(value);
        return this;
    }
    and(column, operator, value) {
        if (value === undefined) {
            value = operator;
            operator = '=';
        }
        this.whereConditions.push({
            column: this.escapeIdentifier(column),
            operator: operator,
            value,
            logic: 'AND',
        });
        this.parameters.push(value);
        return this;
    }
    or(column, operator, value) {
        if (value === undefined) {
            value = operator;
            operator = '=';
        }
        this.whereConditions.push({
            column: this.escapeIdentifier(column),
            operator: operator,
            value,
            logic: 'OR',
        });
        this.parameters.push(value);
        return this;
    }
    whereIn(column, values) {
        if (values.length === 0) {
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
    whereBetween(column, min, max) {
        this.whereConditions.push({
            column: this.escapeIdentifier(column),
            operator: 'BETWEEN',
            value: [min, max],
        });
        this.parameters.push(min, max);
        return this;
    }
    groupBy(...columns) {
        this.groupByColumns = columns.map((col) => this.escapeIdentifier(col));
        return this;
    }
    orderBy(column, direction = 'ASC') {
        this.orderByClauses.push({
            column: this.escapeIdentifier(column),
            direction,
        });
        return this;
    }
    limit(value) {
        this.limitValue = Math.max(0, Math.floor(value));
        return this;
    }
    offset(value) {
        this.offsetValue = Math.max(0, Math.floor(value));
        return this;
    }
    toSql() {
        let sql = `SELECT ${this.select.join(', ')} FROM ${this.fromTable}`;
        for (const join of this.joins) {
            sql += ` ${join.type} JOIN ${join.table} ON ${join.on}`;
        }
        if (this.whereConditions.length > 0) {
            const conditions = this.buildWhereConditions();
            sql += ` WHERE ${conditions}`;
        }
        if (this.groupByColumns.length > 0) {
            sql += ` GROUP BY ${this.groupByColumns.join(', ')}`;
        }
        if (this.orderByClauses.length > 0) {
            const orderClauses = this.orderByClauses.map((o) => `${o.column} ${o.direction}`).join(', ');
            sql += ` ORDER BY ${orderClauses}`;
        }
        if (this.limitValue !== null) {
            sql += ` LIMIT ${this.limitValue}`;
        }
        if (this.offsetValue !== null) {
            sql += ` OFFSET ${this.offsetValue}`;
        }
        return sql;
    }
    getParameters() {
        return this.parameters;
    }
    build() {
        return {
            sql: this.toSql(),
            parameters: this.getParameters(),
        };
    }
    buildWhereConditions() {
        return this.whereConditions
            .map((condition, index) => {
            const prefix = index === 0 ? '' : (condition.logic || 'AND') + ' ';
            switch (condition.operator) {
                case 'IN':
                    const placeholders = condition.value.map(() => '?').join(', ');
                    if (!placeholders) {
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
    escapeIdentifier(identifier) {
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)?$/.test(identifier)) {
            throw new Error(`Invalid identifier: ${identifier}`);
        }
        return identifier;
    }
    reset() {
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
    clone() {
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
exports.QueryBuilder = QueryBuilder;
class InsertBuilder {
    constructor() {
        this.tableName = '';
        this.columnNames = [];
        this.rowValues = [];
        this.parameters = [];
    }
    into(table) {
        this.tableName = this.escapeIdentifier(table);
        return this;
    }
    columns(...columns) {
        this.columnNames = columns.map((col) => this.escapeIdentifier(col));
        return this;
    }
    values(...vals) {
        this.rowValues.push(vals);
        this.parameters.push(...vals);
        return this;
    }
    toSql() {
        const placeholders = this.columnNames.map(() => '?').join(', ');
        const valueSets = this.rowValues.map(() => `(${placeholders})`).join(', ');
        return `INSERT INTO ${this.tableName} (${this.columnNames.join(', ')}) VALUES ${valueSets}`;
    }
    getParameters() {
        return this.parameters;
    }
    build() {
        return {
            sql: this.toSql(),
            parameters: this.getParameters(),
        };
    }
    escapeIdentifier(identifier) {
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
            throw new Error(`Invalid identifier: ${identifier}`);
        }
        return identifier;
    }
}
exports.InsertBuilder = InsertBuilder;
class UpdateBuilder {
    constructor() {
        this.tableName = '';
        this.setValues = new Map();
        this.whereConditions = [];
        this.parameters = [];
    }
    table(table) {
        this.tableName = this.escapeIdentifier(table);
        return this;
    }
    set(column, value) {
        this.setValues.set(this.escapeIdentifier(column), value);
        this.parameters.push(value);
        return this;
    }
    where(column, operator, value) {
        if (value === undefined) {
            value = operator;
            operator = '=';
        }
        this.whereConditions.push({
            column: this.escapeIdentifier(column),
            operator: operator,
            value,
        });
        this.parameters.push(value);
        return this;
    }
    toSql() {
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
    getParameters() {
        return this.parameters;
    }
    build() {
        return {
            sql: this.toSql(),
            parameters: this.getParameters(),
        };
    }
    buildWhereConditions() {
        return this.whereConditions
            .map((condition, index) => {
            const prefix = index === 0 ? '' : (condition.logic || 'AND') + ' ';
            return `${prefix}${condition.column} ${condition.operator} ?`;
        })
            .join(' ');
    }
    escapeIdentifier(identifier) {
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
            throw new Error(`Invalid identifier: ${identifier}`);
        }
        return identifier;
    }
}
exports.UpdateBuilder = UpdateBuilder;
class DeleteBuilder {
    constructor() {
        this.tableName = '';
        this.whereConditions = [];
        this.parameters = [];
    }
    from(table) {
        this.tableName = this.escapeIdentifier(table);
        return this;
    }
    where(column, operator, value) {
        if (value === undefined) {
            value = operator;
            operator = '=';
        }
        this.whereConditions.push({
            column: this.escapeIdentifier(column),
            operator: operator,
            value,
        });
        this.parameters.push(value);
        return this;
    }
    toSql() {
        let sql = `DELETE FROM ${this.tableName}`;
        if (this.whereConditions.length > 0) {
            const conditions = this.buildWhereConditions();
            sql += ` WHERE ${conditions}`;
        }
        return sql;
    }
    getParameters() {
        return this.parameters;
    }
    build() {
        return {
            sql: this.toSql(),
            parameters: this.getParameters(),
        };
    }
    buildWhereConditions() {
        return this.whereConditions
            .map((condition, index) => {
            const prefix = index === 0 ? '' : (condition.logic || 'AND') + ' ';
            return `${prefix}${condition.column} ${condition.operator} ?`;
        })
            .join(' ');
    }
    escapeIdentifier(identifier) {
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
            throw new Error(`Invalid identifier: ${identifier}`);
        }
        return identifier;
    }
}
exports.DeleteBuilder = DeleteBuilder;
//# sourceMappingURL=QueryBuilder.js.map