"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("../../utils/logger");
const menu_1 = __importDefault(require("./menu"));
const stats_1 = __importDefault(require("./stats"));
const reviews_1 = __importDefault(require("./reviews"));
const feedback_1 = __importDefault(require("./feedback"));
const bookRequests_1 = require("./bookRequests");
const bookOrders_1 = __importDefault(require("./bookOrders"));
exports.default = (bot) => {
    logger_1.logger.info('Admin handlers registered');
    (0, menu_1.default)(bot);
    (0, stats_1.default)(bot);
    (0, reviews_1.default)(bot);
    (0, feedback_1.default)(bot);
    (0, bookRequests_1.registerAdminBookRequestHandlers)(bot);
    (0, bookOrders_1.default)(bot);
};
//# sourceMappingURL=index.js.map