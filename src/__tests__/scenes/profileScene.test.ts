import { Scenes } from 'telegraf';
import { BotContext } from '../../types/telegraf';
import profileScene from '../../scenes/profileScene';

describe('profileScene', () => {
  let scene: Scenes.BaseScene<BotContext>;
  let mockCtx: Partial<BotContext>;

  beforeEach(() => {
    scene = profileScene;
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
        username: 'testuser',
      } as any,
    };
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
