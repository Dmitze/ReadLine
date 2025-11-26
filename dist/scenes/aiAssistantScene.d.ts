import { Scenes } from 'telegraf';
declare const aiAssistantScene: Scenes.WizardScene<import("telegraf").Context<import("@telegraf/types").Update> & {
    scene: Scenes.SceneContextScene<unknown, Scenes.WizardSessionData>;
    wizard: Scenes.WizardContextWizard<unknown>;
}>;
export declare function registerAIAssistantHandlers(bot: any): void;
export default aiAssistantScene;
//# sourceMappingURL=aiAssistantScene.d.ts.map