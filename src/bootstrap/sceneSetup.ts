import { Scenes } from 'telegraf';
import addBookScene from '../scenes/addBookScene';
import editBookScene from '../scenes/editBookScene';
import manageBooksScene from '../scenes/manageBooksScene';
import searchScene from '../scenes/searchScene';
import profileScene from '../scenes/profileScene';
import rateBookScene from '../scenes/rateBookScene';
import feedbackScene from '../scenes/feedbackScene';
import aiScene from '../scenes/aiScene';
import replyFeedbackScene from '../scenes/replyFeedbackScene';
import onboardingScene from '../scenes/onboardingScene';
import settingsScene from '../scenes/settingsScene';
import aiAssistantScene from '../scenes/aiAssistantScene';
import promoAdminScene from '../scenes/promoAdminScene';
import editExtendedBookInfoScene from '../scenes/editExtendedBookInfoScene';

export function createStage() {
  return new Scenes.Stage([
    addBookScene,
    editBookScene,
    manageBooksScene,
    searchScene,
    profileScene,
    rateBookScene,
    feedbackScene,
    aiScene,
    replyFeedbackScene,
    onboardingScene,
    settingsScene,
    aiAssistantScene,
    promoAdminScene,
    editExtendedBookInfoScene
  ] as never[]);
}
