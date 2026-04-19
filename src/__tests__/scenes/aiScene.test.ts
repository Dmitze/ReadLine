import { Scenes } from 'telegraf';
import { BotContext } from '../../types/telegraf';
import aiScene from '../../scenes/aiScene';

describe('aiScene', () => {
  let scene: Scenes.BaseScene<BotContext>;

  beforeEach(() => {
    scene = aiScene;
  });

  afterAll(async () => {
    jest.clearAllTimers();
    jest.clearAllMocks();
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
