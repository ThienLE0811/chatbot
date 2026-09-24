import { ConfigService } from '@nestjs/config';
import { TelegramSettings } from './telegram.settings';

const settings = (env: Record<string, string>) =>
  new TelegramSettings(new ConfigService(env));

describe('TelegramSettings', () => {
  it('is off without a token', () => {
    expect(settings({}).mode).toBe('off');
    expect(settings({ TELEGRAM_BOT_TOKEN: '  ' }).mode).toBe('off');
  });

  it('polls when there is a token but no webhook URL', () => {
    expect(settings({ TELEGRAM_BOT_TOKEN: '1:abc' }).mode).toBe('polling');
  });

  it('uses the webhook when a URL is set', () => {
    expect(
      settings({
        TELEGRAM_BOT_TOKEN: '1:abc',
        TELEGRAM_WEBHOOK_URL: 'https://bot.example.com/telegram/webhook',
      }).mode,
    ).toBe('webhook');
  });

  it('defaults the text sent for /start', () => {
    expect(settings({}).startMessage).toBe('xin chào');
    expect(settings({ TELEGRAM_START_MESSAGE: 'hello' }).startMessage).toBe(
      'hello',
    );
  });

  describe('webhookProblem', () => {
    const base = {
      TELEGRAM_BOT_TOKEN: '1:abc',
      TELEGRAM_WEBHOOK_URL: 'https://bot.example.com/telegram/webhook',
    };

    it('requires a secret', () => {
      expect(settings(base).webhookProblem()).toMatch(
        /TELEGRAM_WEBHOOK_SECRET/,
      );
    });

    it('rejects a secret Telegram would not accept', () => {
      expect(
        settings({
          ...base,
          TELEGRAM_WEBHOOK_SECRET: 'có dấu cách',
        }).webhookProblem(),
      ).toMatch(/chỉ gồm/);
    });

    it('requires https', () => {
      expect(
        settings({
          ...base,
          TELEGRAM_WEBHOOK_URL: 'http://bot.example.com/telegram/webhook',
          TELEGRAM_WEBHOOK_SECRET: 's3cret',
        }).webhookProblem(),
      ).toMatch(/https/);
    });

    it('accepts a complete configuration', () => {
      expect(
        settings({
          ...base,
          TELEGRAM_WEBHOOK_SECRET: 's3cret-_1',
        }).webhookProblem(),
      ).toBeNull();
    });
  });

  it('accepts only the configured webhook secret', () => {
    const configured = settings({ TELEGRAM_WEBHOOK_SECRET: 's3cret' });

    expect(configured.isWebhookSecret('s3cret')).toBe(true);
    expect(configured.isWebhookSecret('s3cre')).toBe(false);
    expect(configured.isWebhookSecret(undefined)).toBe(false);
    expect(settings({}).isWebhookSecret('')).toBe(false);
  });
});
