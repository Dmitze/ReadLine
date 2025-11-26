import winston from 'winston';
export declare const enhancedLogger: winston.Logger;
export declare const loggers: {
    userAction: (userId: number, action: string, metadata?: object) => void;
    adminAction: (adminId: number, action: string, metadata?: object) => void;
    dbQuery: (query: string, duration: number, metadata?: object) => void;
    aiRequest: (userId: number, prompt: string, duration: number, metadata?: object) => void;
    performance: (metric: string, value: number, metadata?: object) => void;
    security: (event: string, severity: "low" | "medium" | "high" | "critical", metadata?: object) => void;
};
export default enhancedLogger;
//# sourceMappingURL=enhancedLogger.d.ts.map