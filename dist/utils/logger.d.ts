declare enum LogLevel {
    DEBUG = "DEBUG",
    INFO = "INFO",
    WARN = "WARN",
    ERROR = "ERROR"
}
export type LogMetadata = Record<string, unknown>;
declare class Logger {
    private isDevelopment;
    private formatMessage;
    private log;
    debug(message: string, meta?: LogMetadata): void;
    info(message: string, meta?: LogMetadata): void;
    warn(message: string, meta?: LogMetadata): void;
    error(message: string, error?: Error | unknown, meta?: LogMetadata): void;
    userAction(userId: number, action: string, details?: LogMetadata): void;
    adminAction(adminId: number, action: string, details?: LogMetadata): void;
    dbQuery(query: string, params?: unknown[]): void;
    aiRequest(userId: number, question: string, response: string): void;
}
export declare const logger: Logger;
export { Logger, LogLevel };
//# sourceMappingURL=logger.d.ts.map