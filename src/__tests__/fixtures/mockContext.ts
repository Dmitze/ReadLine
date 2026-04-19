import { BotContext } from '../../types/telegraf';

export function createMockContext(overrides?: Partial<BotContext>): BotContext {
  const mockReply = jest.fn().mockResolvedValue({ message_id: 1 });
  const mockEditMessageText = jest.fn().mockResolvedValue({ message_id: 1 });
  const mockEditMessageReplyMarkup = jest.fn().mockResolvedValue({ message_id: 1 });
  const mockDeleteMessage = jest.fn().mockResolvedValue(true);
  const mockAnswerCallbackQuery = jest.fn().mockResolvedValue(true);

  const baseContext: BotContext = {
    botInfo: {
      id: 999999,
      is_bot: true,
      first_name: 'TestBot',
      username: 'test_bot',
    },

    from: {
      id: 12345,
      is_bot: false,
      first_name: 'Test',
      last_name: 'User',
      username: 'testuser',
      language_code: 'en',
    },

    chat: {
      id: 12345,
      type: 'private',
      first_name: 'Test',
      last_name: 'User',
      username: 'testuser',
    },

    message: {
      message_id: 1,
      date: Math.floor(Date.now() / 1000),
      chat: {
        id: 12345,
        type: 'private',
      },
      text: 'test message',
      from: {
        id: 12345,
        is_bot: false,
        first_name: 'Test',
      },
    },

    callbackQuery: undefined,

    update: {
      update_id: 1,
      message: {
        message_id: 1,
        date: Math.floor(Date.now() / 1000),
        chat: { id: 12345, type: 'private' },
        from: { id: 12345, is_bot: false, first_name: 'Test' },
        text: 'test message',
      },
    },

    state: {
      scene: {},
    },

    session: {
      userId: 12345,
      userData: {},
    },

    scene: {
      enter: jest.fn(),
      exit: jest.fn(),
      reenter: jest.fn(),
      current: 'testScene',
    } as any,

    wizard: {
      state: {},
      cursor: 0,
      next: jest.fn(),
      selectStep: jest.fn(),
      steps: [],
    } as any,

    match: null,

    reply: mockReply,
    replyWithHTML: jest.fn().mockResolvedValue({ message_id: 1 }),
    replyWithMarkdown: jest.fn().mockResolvedValue({ message_id: 1 }),
    replyWithDocument: jest.fn().mockResolvedValue({ message_id: 1 }),
    replyWithPhoto: jest.fn().mockResolvedValue({ message_id: 1 }),
    replyWithVideo: jest.fn().mockResolvedValue({ message_id: 1 }),
    replyWithAudio: jest.fn().mockResolvedValue({ message_id: 1 }),
    editMessageText: mockEditMessageText,
    editMessageReplyMarkup: mockEditMessageReplyMarkup,
    deleteMessage: mockDeleteMessage,
    answerCallbackQuery: mockAnswerCallbackQuery,
    sendMessage: jest.fn().mockResolvedValue({ message_id: 1 }),
    forwardMessage: jest.fn().mockResolvedValue({ message_id: 1 }),
    copyMessage: jest.fn().mockResolvedValue({ message_id: 1 }),
    editMessageCaption: jest.fn().mockResolvedValue({ message_id: 1 }),
    getMe: jest.fn().mockResolvedValue({ id: 999999, is_bot: true }),
    getChatMember: jest.fn().mockResolvedValue({ user: { id: 12345 }, status: 'member' }),

    action: jest.fn(),
    on: jest.fn(),
    hears: jest.fn(),
    command: jest.fn(),
  } as any as BotContext;

  return { ...baseContext, ...overrides };
}

export function createMockContextWithMessage(
  text: string,
  overrides?: Partial<BotContext>
): BotContext {
  return createMockContext({
    message: { text, ...(overrides?.message || {}) },
    ...overrides,
  });
}

export function createMockContextWithCallback(
  data: string,
  overrides?: Partial<BotContext>
): BotContext {
  return createMockContext({
    callbackQuery: {
      id: '12345',
      from: { id: 12345, is_bot: false, first_name: 'Test' },
      chat_instance: '123',
      data,
      message: {
        message_id: 1,
        date: Math.floor(Date.now() / 1000),
        chat: { id: 12345, type: 'private' },
        from: { id: 12345, is_bot: false, first_name: 'Test' },
      },
    },
    ...overrides,
  } as any);
}

export function getContextReplies(context: BotContext): any[] {
  const reply = context.reply as jest.Mock;
  return reply.mock.calls.map((call) => call[0]);
}

export function contextHasReplied(context: BotContext, searchText?: string): boolean {
  const reply = context.reply as jest.Mock;
  if (reply.mock.calls.length === 0) return false;

  if (!searchText) return true;

  return reply.mock.calls.some((call) => {
    const text = call[0];
    return typeof text === 'string' && text.includes(searchText);
  });
}

export function clearContextMocks(context: BotContext): void {
  (context.reply as jest.Mock).mockClear();
  (context.editMessageText as jest.Mock).mockClear();
  (context.deleteMessage as jest.Mock).mockClear();
  (context.answerCallbackQuery as jest.Mock).mockClear();
}
