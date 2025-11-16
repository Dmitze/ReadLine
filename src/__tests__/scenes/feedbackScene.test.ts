import { Scenes } from 'telegraf';
import { BotContext } from '../../types/telegraf';
import feedbackScene from '../../scenes/feedbackScene';

describe('feedbackScene', () => {
  let scene: Scenes.BaseScene<BotContext>;

  beforeEach(() => {
    scene = feedbackScene;
  });

  it('should be defined', () => {
    expect(scene).toBeDefined();
    expect(scene.id).toBe('FEEDBACK_SCENE');
  });

  it('should have middleware', () => {
    expect(scene).toHaveProperty('middleware');
    expect(typeof scene.middleware).toBe('function');
  });
});
