import { ConfigService } from '@nestjs/config';
import { TelegramApi, TelegramError } from './telegram.api';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramLifecycleService } from './telegram-lifecycle.service';
import { TelegramSettings } from './telegram.settings';

describe('TelegramLifecycleService', () => {
  let api: Record<string, jest.Mock>;
  let bot: { dispatch: jest.Mock; drain: jest.Mock };

  const start = (env: Record<string, string>) => {
    const lifecycle = new TelegramLifecycleService(
      new TelegramSettings(new ConfigService(env)),
      api as unknown as TelegramApi,
      bot as unknown as TelegramBotService,
    );
    lifecycle.onApplicationBootstrap();
    return lifecycle;
  };

  beforeEach(() => {
    api = {
      getMe: jest.fn().mockResolvedValue({ username: 'demo_bot' }),
      deleteWebhook: jest.fn().mockResolvedValue(true),
      setWebhook: jest.fn().mockResolvedValue(true),
      getUpdates: jest.fn(),
    };
    bot = {
      dispatch: jest.fn().mockResolvedValue(undefined),
      drain: jest.fn().mockResolvedValue(undefined),
    };
  });

  it('does nothing without a token', async () => {
    const lifecycle = start({});
    await lifecycle.onModuleDestroy();

    expect(api.getMe).not.toHaveBeenCalled();
  });

  it('polls, dispatches updates and acknowledges them with the next offset', async () => {
    const offsets: (number | undefined)[] = [];
    api.getUpdates.mockImplementation(
      async (
        offset: number | undefined,
        _timeout: number,
        signal: AbortSignal,
      ) => {
        offsets.push(offset);
        if (offsets.length === 1) {
          return [
            { update_id: 5, message: {} },
            { update_id: 6, message: {} },
          ];
        }
        // Like Telegram, hold the call open until the poll is cancelled.
        return new Promise((resolve) =>
          signal.addEventListener('abort', () => resolve([])),
        );
      },
    );

    const lifecycle = start({ TELEGRAM_BOT_TOKEN: '1:abc' });
    await new Promise((resolve) => setTimeout(resolve, 10));
    await lifecycle.onModuleDestroy();

    expect(api.deleteWebhook).toHaveBeenCalled();
    expect(bot.dispatch).toHaveBeenCalledTimes(2);
    expect(offsets).toEqual([undefined, 7]);
    expect(bot.drain).toHaveBeenCalled();
  });

  it('stops polling when the token is rejected', async () => {
    api.getUpdates.mockRejectedValue(
      new TelegramError('Telegram getUpdates: Unauthorized', 401),
    );

    const lifecycle = start({ TELEGRAM_BOT_TOKEN: '1:bad' });
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(api.getUpdates).toHaveBeenCalledTimes(1);
    await lifecycle.onModuleDestroy();
  });

  it('registers the webhook with its secret', async () => {
    const lifecycle = start({
      TELEGRAM_BOT_TOKEN: '1:abc',
      TELEGRAM_WEBHOOK_URL: 'https://bot.example.com/telegram/webhook',
      TELEGRAM_WEBHOOK_SECRET: 's3cret',
    });
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(api.setWebhook).toHaveBeenCalledWith(
      'https://bot.example.com/telegram/webhook',
      's3cret',
    );
    expect(api.getUpdates).not.toHaveBeenCalled();
    await lifecycle.onModuleDestroy();
  });

  it('refuses a webhook without a secret', async () => {
    const lifecycle = start({
      TELEGRAM_BOT_TOKEN: '1:abc',
      TELEGRAM_WEBHOOK_URL: 'https://bot.example.com/telegram/webhook',
    });
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(api.setWebhook).not.toHaveBeenCalled();
    await lifecycle.onModuleDestroy();
  });
});
