"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCachedTags = getCachedTags;
exports.clearTagsCache = clearTagsCache;
const tagFunctions_1 = require("../../../database/tagFunctions");
const logger_1 = require("../../../utils/logger");
let cachedTags = [];
let tagsLastUpdated = 0;
const TAGS_CACHE_DURATION = 5 * 60 * 1000;
async function getCachedTags() {
    const now = Date.now();
    if (cachedTags.length === 0 || now - tagsLastUpdated > TAGS_CACHE_DURATION) {
        cachedTags = await (0, tagFunctions_1.getAllTags)();
        tagsLastUpdated = now;
        logger_1.logger.debug('Tags cache updated', { count: cachedTags.length });
    }
    return cachedTags;
}
function clearTagsCache() {
    cachedTags = [];
    tagsLastUpdated = 0;
}
//# sourceMappingURL=cache.js.map