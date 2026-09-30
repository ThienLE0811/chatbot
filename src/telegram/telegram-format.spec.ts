import {
  BUTTONS_ONLY_TEXT,
  MAX_CALLBACK_DATA_BYTES,
  isStartCommand,
  parseUpdate,
  splitText,
  toTelegramMessages,
} from './telegram-format';

const user = { id: 7, is_bot: false, first_name: 'An', username: 'an' };

describe('parseUpdate', () => {
  it('reads a text message', () => {
    expect(
      parseUpdate({
        update_id: 1,
        message: {
          message_id: 10,
          chat: { id: 42, type: 'private' },
          from: user,
          text: 'xin chào',
        },
      }),
    ).toEqual({ chatId: 42, text: 'xin chào', user });
  });

  it('reads a button press as its callback data', () => {
    expect(
      parseUpdate({
        update_id: 2,
        callback_query: {
          id: 'cb1',
          from: user,
          data: '/affirm',
          message: { message_id: 11, chat: { id: 42, type: 'private' } },
        },
      }),
    ).toEqual({ chatId: 42, text: '/affirm', user, callbackQueryId: 'cb1' });
  });

  it('keeps a message without text so the bot can say it only reads text', () => {
    expect(
      parseUpdate({
        update_id: 3,
        message: { message_id: 12, chat: { id: 42, type: 'private' } },
      }),
    ).toMatchObject({ chatId: 42, text: undefined });
  });

  it('ignores messages from bots and unsupported updates', () => {
    expect(
      parseUpdate({
        update_id: 4,
        message: {
          message_id: 13,
          chat: { id: 42, type: 'group' },
          from: { ...user, is_bot: true },
          text: 'hi',
        },
      }),
    ).toBeNull();
    expect(parseUpdate({ update_id: 5 })).toBeNull();
  });
});

describe('isStartCommand', () => {
  it.each(['/start', ' /start ', '/start@my_bot', '/start ref123'])(
    'recognises %p',
    (text) => expect(isStartCommand(text)).toBe(true),
  );

  it.each(['/started', 'start', 'bắt đầu /start'])('ignores %p', (text) =>
    expect(isStartCommand(text)).toBe(false),
  );
});

describe('splitText', () => {
  it('keeps short text whole', () => {
    expect(splitText('xin chào', 20)).toEqual(['xin chào']);
  });

  it('cuts long text at a space without exceeding the limit', () => {
    const chunks = splitText('một hai ba bốn năm sáu', 10);

    expect(chunks.every((chunk) => chunk.length <= 10)).toBe(true);
    expect(chunks.join(' ')).toBe('một hai ba bốn năm sáu');
  });

  it('cuts a word longer than the limit', () => {
    expect(splitText('abcdefghij', 4)).toEqual(['abcd', 'efgh', 'ij']);
  });
});

describe('toTelegramMessages', () => {
  it('sends text replies as text messages', () => {
    expect(
      toTelegramMessages([
        { recipient_id: 's', text: 'Chào bạn!' },
        { recipient_id: 's', text: 'Mình giúp gì được?' },
      ]),
    ).toEqual([
      { kind: 'text', text: 'Chào bạn!', keyboard: undefined },
      { kind: 'text', text: 'Mình giúp gì được?', keyboard: undefined },
    ]);
  });

  it('turns buttons into an inline keyboard whose data is the payload', () => {
    const [message] = toTelegramMessages([
      {
        recipient_id: 's',
        text: 'Bạn hài lòng chứ?',
        buttons: [
          { title: 'Có', payload: '/affirm' },
          { title: 'Không', payload: '/deny' },
        ],
      },
    ]);

    expect(message).toEqual({
      kind: 'text',
      text: 'Bạn hài lòng chứ?',
      keyboard: {
        inline_keyboard: [
          [{ text: 'Có', callback_data: '/affirm' }],
          [{ text: 'Không', callback_data: '/deny' }],
        ],
      },
    });
  });

  it('falls back to the title when the payload is too long for Telegram', () => {
    const payload = `/inform${JSON.stringify({ note: 'x'.repeat(80) })}`;
    expect(Buffer.byteLength(payload)).toBeGreaterThan(MAX_CALLBACK_DATA_BYTES);

    const [message] = toTelegramMessages([
      {
        recipient_id: 's',
        text: 'Chọn',
        buttons: [{ title: 'Tư vấn', payload }],
      },
    ]);

    expect(message).toMatchObject({
      keyboard: {
        inline_keyboard: [[{ text: 'Tư vấn', callback_data: 'Tư vấn' }]],
      },
    });
  });

  it('gives buttons without text a default text', () => {
    expect(
      toTelegramMessages([
        { recipient_id: 's', buttons: [{ title: 'Có', payload: '/affirm' }] },
      ]),
    ).toEqual([
      {
        kind: 'text',
        text: BUTTONS_ONLY_TEXT,
        keyboard: {
          inline_keyboard: [[{ text: 'Có', callback_data: '/affirm' }]],
        },
      },
    ]);
  });

  it('sends an image before its text, with the buttons on the text', () => {
    const messages = toTelegramMessages([
      {
        recipient_id: 's',
        image: 'https://example.com/map.png',
        text: 'Bản đồ',
        buttons: [{ title: 'Ok', payload: '/affirm' }],
      },
    ]);

    expect(messages).toEqual([
      {
        kind: 'photo',
        url: 'https://example.com/map.png',
        keyboard: undefined,
      },
      {
        kind: 'text',
        text: 'Bản đồ',
        keyboard: {
          inline_keyboard: [[{ text: 'Ok', callback_data: '/affirm' }]],
        },
      },
    ]);
  });

  it('skips replies it cannot show, such as custom payloads', () => {
    expect(
      toTelegramMessages([{ recipient_id: 's', custom: { a: 1 } }]),
    ).toEqual([]);
  });
});
