"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStage = createStage;
const telegraf_1 = require("telegraf");
const addBookScene_1 = __importDefault(require("../scenes/addBookScene"));
const editBookScene_1 = __importDefault(require("../scenes/editBookScene"));
const manageBooksScene_1 = __importDefault(require("../scenes/manageBooksScene"));
const searchScene_1 = __importDefault(require("../scenes/searchScene"));
const catalogScene_1 = __importDefault(require("../scenes/catalogScene"));
const profileScene_1 = __importDefault(require("../scenes/profileScene"));
const rateBookScene_1 = __importDefault(require("../scenes/rateBookScene"));
const feedbackScene_1 = __importDefault(require("../scenes/feedbackScene"));
const aiScene_1 = __importDefault(require("../scenes/aiScene"));
const replyFeedbackScene_1 = __importDefault(require("../scenes/replyFeedbackScene"));
const onboardingScene_1 = __importDefault(require("../scenes/onboardingScene"));
const settingsScene_1 = __importDefault(require("../scenes/settingsScene"));
const aiAssistantScene_1 = __importDefault(require("../scenes/aiAssistantScene"));
const promoAdminScene_1 = __importDefault(require("../scenes/promoAdminScene"));
const editExtendedBookInfoScene_1 = __importDefault(require("../scenes/editExtendedBookInfoScene"));
const addPodcastScene_1 = __importDefault(require("../scenes/addPodcastScene"));
const requestPhysicalBookScene_1 = __importDefault(require("../scenes/requestPhysicalBookScene"));
const createBookRequestScene_1 = __importDefault(require("../scenes/createBookRequestScene"));
const bookOrderScene_1 = __importDefault(require("../scenes/bookOrderScene"));
function createStage() {
    return new telegraf_1.Scenes.Stage([
        addBookScene_1.default,
        editBookScene_1.default,
        manageBooksScene_1.default,
        searchScene_1.default,
        catalogScene_1.default,
        profileScene_1.default,
        rateBookScene_1.default,
        feedbackScene_1.default,
        aiScene_1.default,
        replyFeedbackScene_1.default,
        onboardingScene_1.default,
        settingsScene_1.default,
        aiAssistantScene_1.default,
        promoAdminScene_1.default,
        editExtendedBookInfoScene_1.default,
        addPodcastScene_1.default,
        requestPhysicalBookScene_1.default,
        createBookRequestScene_1.default,
        bookOrderScene_1.default,
    ]);
}
//# sourceMappingURL=sceneSetup.js.map