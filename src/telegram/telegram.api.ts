import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { TelegramSettings } from './telegram.settings';
import {
  InlineKeyboardMarkup,
  TelegramResponse,
  TelegramUpdate,
  TelegramUser,
} from './telegram.types';

const REQUEST_TIMEOUT_MS = 15_000;
/** Updates the bot handles; anything else is not delivered at all. */
export const ALLOWED_UPDATES = ['message', 'callback_query'];

export class TelegramError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    /** Seconds Telegram asks to wait before the next call (HTTP 429). */
    readonly retryAfter?: number,
  ) {
    super(message);
    this.name = 'TelegramError';
  }
}

/**
 * Thin client of the Telegram Bot API. The bot token is part of every URL,
 * so axios errors are never rethrown as they are: they carry the URL and
 * would leak the token into logs.
 */
@Injectable()
export class TelegramApi {
  private readonly http: AxiosInstance | null;

  constructor(settings: TelegramSettings) {
    this.http = settings.token
      ? axios.create({
          baseURL: `https://api.telegram.org/bot${settings.token}/`,
          timeout: REQUEST_TIMEOUT_MS,
        })
      : null;
  }

  getMe(): Promise<TelegramUser> {
    return this.call('getMe', {});
  }

  /** Long polling: Telegram holds the request up to `timeoutSec` until an update arrives. */
  getUpdates(
    offset: number | undefined,
    timeoutSec: number,
    signal?: AbortSignal,
  ): Promise<TelegramUpdate[]> {
    return this.call(
      'getUpdates',
      { offset, timeout: timeoutSec, allowed_updates: ALLOWED_UPDATES },
      { timeout: (timeoutSec + 10) * 1000, signal },
    );
  }

  sendMessage(
    chatId: number,
    text: string,
    replyMarkup?: InlineKeyboardMarkup,
  ): Promise<unknown> {
    return this.call('sendMessage', {
      chat_id: chatId,
      text,
      reply_markup: replyMarkup,
    });
  }

  sendPhoto(
    chatId: number,
    photoUrl: string,
    replyMarkup?: InlineKeyboardMarkup,
  ): Promise<unknown> {
    return this.call('sendPhoto', {
      chat_id: chatId,
      photo: photoUrl,
      reply_markup: replyMarkup,
    });
  }

  /** Shows "typing…" in the chat for about five seconds. */
  sendTyping(chatId: number): Promise<unknown> {
    return this.call('sendChatAction', { chat_id: chatId, action: 'typing' });
  }

  /** Stops the loading indicator on the button the user pressed. */
  answerCallbackQuery(callbackQueryId: string): Promise<unknown> {
    return this.call('answerCallbackQuery', {
      callback_query_id: callbackQueryId,
    });
  }

  setWebhook(url: string, secretToken: string): Promise<unknown> {
    return this.call('setWebhook', {
      url,
      secret_token: secretToken,
      allowed_updates: ALLOWED_UPDATES,
    });
  }

  /** getUpdates is refused while a webhook is set. */
  deleteWebhook(): Promise<unknown> {
    return this.call('deleteWebhook', {});
  }

  private async call<T>(
    method: string,
    params: object,
    options: { timeout?: number; signal?: AbortSignal } = {},
  ): Promise<T> {
    if (!this.http) {
      throw new TelegramError('Chưa cấu hình TELEGRAM_BOT_TOKEN');
    }
    try {
      const { data } = await this.http.post<TelegramResponse<T>>(
        method,
        params,
        options,
      );
      if (!data.ok) {
        throw new TelegramError(
          `Telegram ${method}: ${data.description ?? 'thất bại'}`,
          data.error_code,
        );
      }
      return data.result as T;
    } catch (error) {
      if (error instanceof TelegramError) throw error;
      if (axios.isAxiosError(error)) {
        const body = error.response?.data as
          | TelegramResponse<unknown>
          | undefined;
        throw new TelegramError(
          `Telegram ${method}: ${
            body?.description ?? error.code ?? 'không kết nối được'
          }`,
          body?.error_code ?? error.response?.status,
          body?.parameters?.retry_after,
        );
      }
      throw new TelegramError(
        `Telegram ${method}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
