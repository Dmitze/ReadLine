import { Scenes } from 'telegraf';
import { BotContext } from '../../types/telegraf';
import settingsScene from '../../scenes/settingsScene';

describe('settingsScene', () => {
  let scene: Scenes.BaseScene<BotContext>;

  beforeEach(() => {
    scene = settingsScene;
  });

  it('should be defined', () => {
    expect(scene).toBeDefined();
    expect(scene.id).toBe('SETTINGS_SCENE');
  });

  it('should have handlers', () => {
    expect(scene).toHaveProperty('middleware');
    expect(typeof scene.middleware).toBe('function');
  });
});
