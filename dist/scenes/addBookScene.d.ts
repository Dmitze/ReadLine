import { Scenes } from 'telegraf';
import { BotContext } from '../types/telegraf';
declare const addBookScene: Scenes.WizardScene<import("telegraf").Context<import("@telegraf/types").Update> & {
    scene: Scenes.SceneContextScene<BotContext, Scenes.WizardSessionData>;
    wizard: Scenes.WizardContextWizard<BotContext>;
}>;
export default addBookScene;
//# sourceMappingURL=addBookScene.d.ts.map