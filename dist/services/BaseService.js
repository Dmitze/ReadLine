"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseService = void 0;
const Result_1 = require("../core/Result");
class BaseService {
    constructor(logger) {
        this.logger = logger;
    }
    async executeAsync(operation, operationName) {
        try {
            this.logger.debug(`[${this.constructor.name}] Starting: ${operationName}`);
            const result = await (0, Result_1.asyncResult)(operation);
            if (result.isOk()) {
                this.logger.debug(`[${this.constructor.name}] Completed: ${operationName}`);
            }
            else {
                this.logger.warn(`[${this.constructor.name}] Failed: ${operationName}`, result.error);
            }
            return result;
        }
        catch (error) {
            const e = error instanceof Error ? error : new Error(String(error));
            this.logger.error(`[${this.constructor.name}] Error in ${operationName}`, e);
            return (0, Result_1.err)(e);
        }
    }
    executeSync(operation, operationName) {
        try {
            this.logger.debug(`[${this.constructor.name}] Starting: ${operationName}`);
            const result = operation();
            this.logger.debug(`[${this.constructor.name}] Completed: ${operationName}`);
            return (0, Result_1.ok)(result);
        }
        catch (error) {
            const e = error instanceof Error ? error : new Error(String(error));
            this.logger.error(`[${this.constructor.name}] Error in ${operationName}`, e);
            return (0, Result_1.err)(e);
        }
    }
    validate(data, rules) {
        const errors = {};
        for (const [field, validator] of Object.entries(rules)) {
            const error = validator(data[field]);
            if (error) {
                errors[field] = error;
            }
        }
        if (Object.keys(errors).length > 0) {
            return (0, Result_1.err)(errors);
        }
        return (0, Result_1.ok)(null);
    }
}
exports.BaseService = BaseService;
//# sourceMappingURL=BaseService.js.map