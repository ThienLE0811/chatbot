import { ConfigService } from '@nestjs/config';
import { RasaClient, RasaError } from '../training/rasa/rasa.client';
import { TelegramApi } from './telegram.api';
import {
  BOT_UNAVAILABLE_TEXT,
  NO_REPLY_TEXT,
  TelegramBotService,
  UNSUPPORTED_MESSAGE_TEXT,
} from './telegram-bot.service';
import { TelegramSettings } from './telegram.settings';
import { TelegramUpdate } from './telegram.types';

const user = { id: 7, is_bot: false, first_name: 'An', username: 'an' };

const textUpdate = (text: string, chatId = 42): TelegramUpdate => ({
  update_id: 1,
  message: {
    message_id: 1,
    chat: { id: chatId, type: 'private' },
    from: user,
    text,
  },
});

describe('TelegramBotService', () => {
  let api: Record<string, jest.Mock>;
  let rasa: { sendMessage: jest.Mock; tracker: jest.Mock };
  let messages: { insertMany: jest.Mock };
  let bot: TelegramBotService;

  beforeEach(() => {
    api = {
      sendMessage: jest.fn().mockResolvedValue({}),
      sendPhoto: jest.fn().mockResolvedValue({}),
      sendTyping: jest.fn().mockResolvedValue({}),
      answerCallbackQuery: jest.fn().mockResolvedValue({}),
    };
    rasa = {
      sendMessage: jest
        .fn()
        .mockResolvedValue([
          { recipient_id: 'telegram-42', text: 'Chào bạn!' },
        ]),
      tracker: jest.fn().mockResolvedValue({
        sender_id: 'telegram-42',
        slots: {},
        events: [
          {
            event: 'user',
            text: 'xin chào',
            parse_data: { intent: { name: 'greet', confidence: 0.9 } },
          },
          {
            event: 'action',
            name: 'utter_greet',
            policy: 'policy_1_RulePolicy',
            confidence: 1,
          },
        ],
      }),
    };
    messages = { insertMany: jest.fn().mockResolvedValue([]) };
    bot = new TelegramBotService(
      api as unknown as TelegramApi,
      rasa as unknown as RasaClient,
      new TelegramSettings(new ConfigService({})),
      messages as any,
    );
  });

  it('relays a message to Rasa as that chat and sends the reply back', async () => {
    await bot.dispatch(textUpdate('xin chào'));

    expect(api.sendTyping).toHaveBeenCalledWith(42);
    expect(rasa.sendMessage).toHaveBeenCalledWith('telegram-42', 'xin chào');
    expect(api.sendMessage).toHaveBeenCalledWith(42, 'Chào bạn!', undefined);
  });

  it('records both sides with the intent Rasa recognised', async () => {
    await bot.dispatch(textUpdate('xin chào'));

    expect(messages.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({
        channel: 'telegram',
        senderId: 'telegram-42',
        from: 'user',
        text: 'xin chào',
        intent: { name: 'greet', confidence: 0.9 },
        actions: ['utter_greet'],
        user: { id: 7, username: 'an', firstName: 'An' },
      }),
      expect.objectContaining({ from: 'bot', text: 'Chào bạn!' }),
    ]);
  });

  it('sends the configured greeting to Rasa for /start', async () => {
    await bot.dispatch(textUpdate('/start'));

    expect(rasa.sendMessage).toHaveBeenCalledWith('telegram-42', 'xin chào');
  });

  it('acknowledges a button press and sends its payload', async () => {
    await bot.dispatch({
      update_id: 2,
      callback_query: {
        id: 'cb1',
        from: user,
        data: '/affirm',
        message: { message_id: 3, chat: { id: 42, type: 'private' } },
      },
    });

    expect(api.answerCallbackQuery).toHaveBeenCalledWith('cb1');
    expect(rasa.sendMessage).toHaveBeenCalledWith('telegram-42', '/affirm');
  });

  it('asks for text instead of calling Rasa for other messages', async () => {
    await bot.dispatch({
      update_id: 3,
      message: { message_id: 4, chat: { id: 42, type: 'private' }, from: user },
    });

    expect(rasa.sendMessage).not.toHaveBeenCalled();
    expect(api.sendMessage).toHaveBeenCalledWith(
      42,
      UNSUPPORTED_MESSAGE_TEXT,
      undefined,
    );
  });

  it('apologises and records the error when Rasa fails', async () => {
    rasa.sendMessage.mockRejectedValue(
      new RasaError('Rasa không trả lời tin nhắn (ECONNREFUSED)'),
    );

    await bot.dispatch(textUpdate('xin chào'));

    expect(api.sendMessage).toHaveBeenCalledWith(
      42,
      BOT_UNAVAILABLE_TEXT,
      undefined,
    );
    expect(rasa.tracker).not.toHaveBeenCalled();
    expect(messages.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({
        from: 'user',
        error: 'Rasa không trả lời tin nhắn (ECONNREFUSED)',
      }),
    ]);
  });

  it('does not stay silent when Rasa answers nothing', async () => {
    rasa.sendMessage.mockResolvedValue([]);

    await bot.dispatch(textUpdate('???'));

    expect(api.sendMessage).toHaveBeenCalledWith(42, NO_REPLY_TEXT, undefined);
  });

  it('still answers when the conversation cannot be recorded', async () => {
    rasa.tracker.mockRejectedValue(new Error('down'));
    messages.insertMany.mockRejectedValue(new Error('mongo down'));

    await expect(bot.dispatch(textUpdate('xin chào'))).resolves.toBeUndefined();
    expect(api.sendMessage).toHaveBeenCalledWith(42, 'Chào bạn!', undefined);
  });

  it('answers messages of one chat in the order they arrived', async () => {
    let releaseFirst!: () => void;
    rasa.sendMessage
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            releaseFirst = () =>
              resolve([{ recipient_id: 'telegram-42', text: 'một' }]);
          }),
      )
      .mockResolvedValueOnce([{ recipient_id: 'telegram-42', text: 'hai' }]);

    const first = bot.dispatch(textUpdate('1'));
    const second = bot.dispatch(textUpdate('2'));
    await new Promise((resolve) => setImmediate(resolve));
    expect(rasa.sendMessage).toHaveBeenCalledTimes(1);

    releaseFirst();
    await Promise.all([first, second]);

    expect(api.sendMessage.mock.calls.map(([, text]) => text)).toEqual([
      'một',
      'hai',
    ]);
  });
});
