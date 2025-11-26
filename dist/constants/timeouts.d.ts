export declare const TIMEOUTS: {
    readonly DATABASE_BUSY: 3000;
    readonly DATABASE_QUERY: 5000;
    readonly DATABASE_TRANSACTION: 10000;
    readonly MESSAGE_DELETE_DELAY: 300;
    readonly MESSAGE_SEND_DELAY: 500;
    readonly TYPING_INDICATOR: 2000;
    readonly AI_REQUEST: 30000;
    readonly AI_SEARCH: 10000;
    readonly CACHE_TTL: 300000;
    readonly CACHE_CLEANUP: 600000;
    readonly CACHE_SHORT: 60000;
    readonly API_REQUEST: 5000;
    readonly HTTP_TIMEOUT: 10000;
    readonly RATE_LIMIT_WINDOW: 60000;
    readonly RETRY_INITIAL: 500;
    readonly RETRY_MAX: 10000;
    readonly QUEUE_PROCESS_DELAY: 500;
    readonly QUEUE_CLEANUP: 3000;
};
export declare const seconds: (n: number) => number;
export declare const minutes: (n: number) => number;
export declare const hours: (n: number) => number;
//# sourceMappingURL=timeouts.d.ts.map