import { ConfigService } from '@nestjs/config';
import { AxiosError, AxiosHeaders } from 'axios';
import { TelegramApi, TelegramError } from './telegram.api';
import { TelegramSettings } from './telegram.settings';

const TOKEN = '123456:SECRET-token';

function telegramApi(
  env: Record<string, string> = { TELEGRAM_BOT_TOKEN: TOKEN },
) {
  const api = new TelegramApi(new TelegramSettings(new ConfigService(env)));
  const post = jest.fn();
  if ((api as any).http) (api as any).http.post = post;
  return { api, post };
}

function httpError(status: number, data: unknown) {
  const config = {
    headers: new AxiosHeaders(),
    url: `https://api.telegram.org/bot${TOKEN}/sendMessage`,
  };
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, {
    status,
    statusText: '',
    headers: {},
    config,
    data,
  });
}

describe('TelegramApi', () => {
  it('returns the result of a successful call', async () => {
    const { api, post } = telegramApi();
    post.mockResolvedValue({
      data: { ok: true, result: { username: 'demo_bot' } },
    });

    await expect(api.getMe()).resolves.toEqual({ username: 'demo_bot' });
    expect(post).toHaveBeenCalledWith('getMe', {}, {});
  });

  it('reports Telegram errors without the token', async () => {
    const { api, post } = telegramApi();
    post.mockRejectedValue(
      httpError(429, {
        ok: false,
        error_code: 429,
        description: 'Too Many Requests: retry after 3',
        parameters: { retry_after: 3 },
      }),
    );

    const error = await api
      .sendMessage(1, 'hi')
      .then(() => undefined)
      .catch((e: TelegramError) => e);

    expect(error).toBeInstanceOf(TelegramError);
    expect(error.status).toBe(429);
    expect(error.retryAfter).toBe(3);
    expect(error.message).toBe(
      'Telegram sendMessage: Too Many Requests: retry after 3',
    );
    expect(JSON.stringify(error)).not.toContain('SECRET');
    expect(error.message).not.toContain('SECRET');
  });

  it('fails clearly when no token is configured', async () => {
    const { api } = telegramApi({});

    await expect(api.getMe()).rejects.toThrow(
      'Chưa cấu hình TELEGRAM_BOT_TOKEN',
    );
  });
});
