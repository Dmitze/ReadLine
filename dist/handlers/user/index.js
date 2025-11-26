"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUserHandlers = registerUserHandlers;
exports.resetHandlersFlag = resetHandlersFlag;
const logger_1 = require("../../utils/logger");
const catalog_1 = require("./catalog");
const bookActions_1 = require("./bookActions");
const library_1 = require("./library");
const navigation_1 = require("./navigation");
const topAndNew_1 = require("./topAndNew");
const misc_1 = require("./misc");
const podcasts_1 = require("./podcasts");
const physicalBooks_1 = require("./physicalBooks");
const bookRequests_1 = require("./bookRequests");
const aiAssistantScene_1 = require("../../scenes/aiAssistantScene");
const profileHandlers_1 = require("./profileHandlers");
let handlersRegistered = false;
function registerUserHandlers(bot) {
    if (handlersRegistered) {
        logger_1.logger.warn('User handlers already registered, skipping...');
        return;
    }
    logger_1.logger.info('Registering user handlers...');
    try {
        (0, navigation_1.registerNavigationHandlers)(bot);
        (0, topAndNew_1.registerTopAndNewHandlers)(bot);
        (0, library_1.registerLibraryHandlers)(bot);
        (0, misc_1.registerMiscHandlers)(bot);
        (0, catalog_1.registerCatalogHandlers)(bot);
        (0, bookActions_1.registerBookActionHandlers)(bot);
        (0, podcasts_1.registerPodcastHandlers)(bot);
        (0, physicalBooks_1.registerPhysicalBooksHandlers)(bot);
        (0, bookRequests_1.registerBookRequestHandlers)(bot);
        (0, aiAssistantScene_1.registerAIAssistantHandlers)(bot);
        (0, profileHandlers_1.registerProfileHandlers)(bot);
        handlersRegistered = true;
        logger_1.logger.info('✅ All user handlers registered successfully');
    }
    catch (error) {
        logger_1.logger.error('Failed to register user handlers', error instanceof Error ? error : new Error(String(error)));
        throw error;
    }
}
function resetHandlersFlag() {
    handlersRegistered = false;
}
//# sourceMappingURL=index.js.map