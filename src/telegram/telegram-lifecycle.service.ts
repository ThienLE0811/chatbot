import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { TelegramApi, TelegramError } from './telegram.api';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramSettings } from './telegram.settings';

/** Seconds Telegram keeps a getUpdates call open while waiting for messages. */
const POLL_TIMEOUT_SEC = 25;
const MAX_RETRY_DELAY_MS = 30_000;
const UNAUTHORIZED = 401;
const CONFLICT = 409;

/**
 * Starts the bot in the mode chosen by TelegramSettings: registers the
 * webhook, or runs the long-polling loop until the module is destroyed.
 */
@Injectable()
export class TelegramLifecycleService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(TelegramLifecycleService.name);
  private readonly abort = new AbortController();
  private polling: Promise<void> | undefined;

  constructor(
    private readonly settings: TelegramSettings,
    private readonly api: TelegramApi,
    private readonly bot: TelegramBotService,
  ) {}

  onApplicationBootstrap() {
    const mode = this.settings.mode;
    if (mode === 'off') {
      this.logger.log('Bot Telegram đang tắt (chưa có TELEGRAM_BOT_TOKEN)');
    } else if (mode === 'webhook') {
      // Not awaited so an unreachable Telegram cannot hold up startup.
      void this.registerWebhook();
    } else {
      this.polling = this.poll();
    }
  }

  async onModuleDestroy() {
    this.abort.abort();
    await this.polling;
    await this.bot.drain();
  }

  private async registerWebhook() {
    const problem = this.settings.webhookProblem();
    if (problem) {
      this.logger.error(`Không bật được webhook Telegram: ${problem}`);
      return;
    }
    try {
      const me = await this.api.getMe();
      await this.api.setWebhook(
        this.settings.webhookUrl,
        this.settings.webhookSecret,
      );
      this.logger.log(
        `Bot Telegram @${me.username} nhận tin qua webhook ${this.settings.webhookUrl}`,
      );
    } catch (error) {
      this.logger.error(`Không đăng ký được webhook: ${error.message}`);
    }
  }

  private async poll() {
    const { signal } = this.abort;
    try {
      const me = await this.api.getMe();
      await this.api.deleteWebhook();
      this.logger.log(`Bot Telegram @${me.username} đang chạy (long polling)`);
    } catch (error) {
      this.logger.error(`Không khởi động được bot Telegram: ${error.message}`);
      return;
    }

    let offset: number | undefined;
    let failures = 0;
    while (!signal.aborted) {
      try {
        const updates = await this.api.getUpdates(
          offset,
          POLL_TIMEOUT_SEC,
          signal,
        );
        failures = 0;
        for (const update of updates) {
          // Acknowledged on the next call, so an update is never fetched twice.
          offset = update.update_id + 1;
          void this.bot.dispatch(update);
        }
      } catch (error) {
        if (signal.aborted) break;
        if (error instanceof TelegramError && error.status === UNAUTHORIZED) {
          this.logger.error('TELEGRAM_BOT_TOKEN không hợp lệ, dừng bot');
          return;
        }
        failures += 1;
        const delay =
          error instanceof TelegramError && error.retryAfter
            ? error.retryAfter * 1000
            : Math.min(1000 * 2 ** failures, MAX_RETRY_DELAY_MS);
        this.logger.warn(
          error instanceof TelegramError && error.status === CONFLICT
            ? 'Một tiến trình khác đang nhận tin của bot này (hai backend cùng chạy?), thử lại sau'
            : `Lỗi khi nhận tin Telegram: ${error.message}`,
        );
        await sleep(delay, signal);
      }
    }
  }
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(done, ms);
    signal.addEventListener('abort', done, { once: true });
    function done() {
      clearTimeout(timer);
      signal.removeEventListener('abort', done);
      resolve();
    }
  });
}
