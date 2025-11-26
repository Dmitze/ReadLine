export interface ValidationRule {
    field: string;
    rules: string[];
    message?: string;
}
export interface ValidationError {
    field: string;
    message: string;
    value?: unknown;
}
export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
}
export declare class Validator {
    private static readonly patterns;
    static validate(value: unknown, rules: string[]): ValidationError | null;
    private static validateRule;
    private static hasSuspiciousPatterns;
    static sanitize(value: unknown, type?: string): unknown;
    static validateObject(data: Record<string, unknown>, schema: Record<string, string[]>): ValidationResult;
    static validateAndSanitize(data: Record<string, unknown>, schema: Record<string, {
        rules: string[];
        type?: string;
    }>): {
        valid: boolean;
        data: Record<string, unknown>;
        errors: ValidationError[];
    };
}
export declare class ValidationBuilder {
    private rules;
    field(name: string): this;
    private _currentField;
    required(): this;
    string(): this;
    number(): this;
    email(): this;
    min(length: number): this;
    max(length: number): this;
    between(min: number, max: number): this;
    in(...values: unknown[]): this;
    pattern(regex: string | RegExp): this;
    safe(): this;
    private addRule;
    build(): Record<string, string[]>;
    validate(data: Record<string, unknown>): ValidationResult;
}
//# sourceMappingURL=Validator.d.ts.map