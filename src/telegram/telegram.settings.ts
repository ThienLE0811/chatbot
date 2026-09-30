import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';

/**
 * - off: no bot token, the bot does not run
 * - polling: the backend asks Telegram for new messages, works without a public URL
 * - webhook: Telegram posts messages to TELEGRAM_WEBHOOK_URL (production)
 */
export type TelegramMode = 'off' | 'polling' | 'webhook';

/** Characters Telegram accepts in a webhook secret token. */
const WEBHOOK_SECRET_PATTERN = /^[\w-]{1,256}$/;
const DEFAULT_START_MESSAGE = 'xin chào';

@Injectable()
export class TelegramSettings {
  readonly token: string | null;
  readonly webhookUrl: string | null;
  readonly webhookSecret: string | null;
  /** Sent to Rasa in place of /start, which is not something users say. */
  readonly startMessage: string;

  constructor(config: ConfigService) {
    this.token = config.get<string>('TELEGRAM_BOT_TOKEN')?.trim() || null;
    this.webhookUrl =
      config.get<string>('TELEGRAM_WEBHOOK_URL')?.trim() || null;
    this.webhookSecret =
      config.get<string>('TELEGRAM_WEBHOOK_SECRET')?.trim() || null;
    this.startMessage =
      config.get<string>('TELEGRAM_START_MESSAGE')?.trim() ||
      DEFAULT_START_MESSAGE;
  }

  get mode(): TelegramMode {
    if (!this.token) return 'off';
    return this.webhookUrl ? 'webhook' : 'polling';
  }

  /** Why webhook mode cannot start, or null when it can. */
  webhookProblem(): string | null {
    if (!this.webhookSecret) {
      return 'TELEGRAM_WEBHOOK_URL cần đi kèm TELEGRAM_WEBHOOK_SECRET';
    }
    if (!WEBHOOK_SECRET_PATTERN.test(this.webhookSecret)) {
      return 'TELEGRAM_WEBHOOK_SECRET chỉ gồm chữ, số, "_" hoặc "-" (tối đa 256 ký tự)';
    }
    if (!this.webhookUrl.startsWith('https://')) {
      return 'TELEGRAM_WEBHOOK_URL phải là địa chỉ https://';
    }
    return null;
  }

  /** Telegram sends the secret in X-Telegram-Bot-Api-Secret-Token on every webhook call. */
  isWebhookSecret(received: string | undefined): boolean {
    if (!this.webhookSecret || typeof received !== 'string') return false;
    const expected = Buffer.from(this.webhookSecret);
    const actual = Buffer.from(received);
    return (
      expected.length === actual.length && timingSafeEqual(expected, actual)
    );
  }
}
