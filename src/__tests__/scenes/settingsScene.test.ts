import { Scenes } from 'telegraf';
import { BotContext } from '../../types/telegraf';
import settingsScene from '../../scenes/settingsScene';

describe('settingsScene', () => {
  let scene: Scenes.BaseScene<BotContext>;
  let mockCtx: Partial<BotContext>;

  beforeEach(() => {
    scene = settingsScene;
    mockCtx = {
      reply: jest.fn().mockResolvedValue({}),
      answerCbQuery: jest.fn().mockResolvedValue(true),
      editMessageText: jest.fn().mockResolvedValue(true),
      scene: {
        leave: jest.fn().mockResolvedValue({}),
      } as any,
      from: {
        id: 123456,
        is_bot: false,
        first_name: 'Test',
      } as any,
    };
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
