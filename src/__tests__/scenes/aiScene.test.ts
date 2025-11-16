import { Scenes } from 'telegraf';
import { BotContext } from '../../types/telegraf';
import aiScene from '../../scenes/aiScene';

describe('aiScene', () => {
  let scene: Scenes.BaseScene<BotContext>;
  let mockCtx: Partial<BotContext>;

  beforeEach(() => {
    scene = aiScene;
    mockCtx = {
      reply: jest.fn().mockResolvedValue({}),
      answerCbQuery: jest.fn().mockResolvedValue(true),
      scene: {
        leave: jest.fn().mockResolvedValue({}),
      } as any,
      from: {
        id: 123456,
        is_bot: false,
        first_name: 'Test',
      } as any,
      message: {
        text: 'Test AI question',
      } as any,
    };
  });

  it('should be defined', () => {
    expect(scene).toBeDefined();
    expect(scene.id).toBe('AI_SCENE');
  });

  it('should have middleware', () => {
    expect(scene).toHaveProperty('middleware');
    expect(typeof scene.middleware).toBe('function');
  });
});
