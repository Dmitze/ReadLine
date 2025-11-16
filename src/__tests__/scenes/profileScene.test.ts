import { Scenes } from 'telegraf';
import { BotContext } from '../../types/telegraf';
import profileScene from '../../scenes/profileScene';

describe('profileScene', () => {
  let scene: Scenes.BaseScene<BotContext>;

  beforeEach(() => {
    scene = profileScene;
  });

  it('should be defined', () => {
    expect(scene).toBeDefined();
    expect(scene.id).toBe('PROFILE_SCENE');
  });

  it('should have middleware', () => {
    expect(scene).toHaveProperty('middleware');
    expect(typeof scene.middleware).toBe('function');
  });
});
