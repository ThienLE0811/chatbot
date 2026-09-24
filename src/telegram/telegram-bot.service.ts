import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { turnsFromEvents } from '../chat-test/tracker-turns';
import { RasaBotMessage, RasaClient } from '../training/rasa/rasa.client';
import { KeyedQueue } from './keyed-queue';
import {
  ConversationMessage,
  ConversationMessageDocument,
} from '../conversations/schemas/conversation-message.schema';
import { TelegramApi } from './telegram.api';
import {
  IncomingMessage,
  OutgoingMessage,
  isStartCommand,
  parseUpdate,
  toTelegramMessages,
} from './telegram-format';
import { TelegramSettings } from './telegram.settings';
import { TelegramUpdate } from './telegram.types';

/** "typing…" disappears after about 5 s, so it is renewed while Rasa works. */
const TYPING_INTERVAL_MS = 4_000;

export const UNSUPPORTED_MESSAGE_TEXT =
  'Hiện mình chỉ đọc được tin nhắn dạng chữ thôi, bạn nhắn giúp mình bằng chữ nhé.';
export const BOT_UNAVAILABLE_TEXT =
  'Xin lỗi, bot đang gặp sự cố. Bạn thử lại sau ít phút nhé.';
export const NO_REPLY_TEXT =
  'Xin lỗi, mình chưa trả lời được câu này. Bạn thử hỏi cách khác nhé.';

/** Rasa sender id of a Telegram chat; each chat is its own conversation. */
export function senderIdFor(chatId: number): string {
  return `telegram-${chatId}`;
}

/**
 * Relays Telegram messages to Rasa's REST channel and sends the replies back,
 * then records both sides of the exchange.
 */
@Injectable()
export class TelegramBotService {
  private readonly logger = new Logger(TelegramBotService.name);
  private readonly queue = new KeyedQueue();

  constructor(
    private readonly api: TelegramApi,
    private readonly rasa: RasaClient,
    private readonly settings: TelegramSettings,
    @InjectModel(ConversationMessage.name)
    private readonly messages: Model<ConversationMessageDocument>,
  ) {}

  /**
   * Handles the update after earlier ones from the same chat. Never rejects:
   * failures are answered in the chat and logged.
   */
  dispatch(update: TelegramUpdate): Promise<void> {
    const incoming = parseUpdate(update);
    if (!incoming) return Promise.resolve();
    return this.queue
      .run(String(incoming.chatId), () => this.handle(incoming))
      .catch((error) =>
        this.logger.error(
          `Không xử lý được tin nhắn Telegram: ${error?.message ?? error}`,
        ),
      );
  }

  /** Resolves once every received message has been answered. */
  drain(): Promise<void> {
    return this.queue.drain();
  }

  private async handle(incoming: IncomingMessage): Promise<void> {
    const { chatId, text } = incoming;
    if (incoming.callbackQueryId) {
      await this.api
        .answerCallbackQuery(incoming.callbackQueryId)
        .catch((error) => this.logger.warn(error.message));
    }
    if (!text?.trim()) {
      await this.send(chatId, [
        { kind: 'text', text: UNSUPPORTED_MESSAGE_TEXT },
      ]);
      return;
    }

    const senderId = senderIdFor(chatId);
    const rasaText = isStartCommand(text) ? this.settings.startMessage : text;

    let replies: RasaBotMessage[];
    try {
      replies = await this.whileTyping(chatId, () =>
        this.rasa.sendMessage(senderId, rasaText),
      );
    } catch (error) {
      this.logger.warn(`Rasa không trả lời chat ${chatId}: ${error.message}`);
      await this.send(chatId, [{ kind: 'text', text: BOT_UNAVAILABLE_TEXT }]);
      await this.record(incoming, senderId, [], error.message);
      return;
    }

    // The REST channel answers an empty list when Rasa failed internally or
    // has no model loaded; staying silent would look like a dead bot.
    const outgoing = toTelegramMessages(replies);
    await this.send(
      chatId,
      outgoing.length ? outgoing : [{ kind: 'text', text: NO_REPLY_TEXT }],
    );
    await this.record(incoming, senderId, replies);
  }

  private async whileTyping<T>(
    chatId: number,
    work: () => Promise<T>,
  ): Promise<T> {
    const typing = () => this.api.sendTyping(chatId).catch(() => undefined);
    typing();
    const timer = setInterval(typing, TYPING_INTERVAL_MS);
    try {
      return await work();
    } finally {
      clearInterval(timer);
    }
  }

  /** Sends in order and stops at the first failure, so later parts are not out of context. */
  private async send(chatId: number, messages: OutgoingMessage[]) {
    try {
      for (const message of messages) {
        if (message.kind === 'photo') {
          await this.api.sendPhoto(chatId, message.url, message.keyboard);
        } else {
          await this.api.sendMessage(chatId, message.text, message.keyboard);
        }
      }
    } catch (error) {
      this.logger.warn(
        `Không gửi được tin nhắn tới chat ${chatId}: ${error.message}`,
      );
    }
  }

  /** Best effort: a Mongo or tracker failure must not affect the chat. */
  private async record(
    incoming: IncomingMessage,
    senderId: string,
    replies: RasaBotMessage[],
    error?: string,
  ) {
    try {
      const turn = error
        ? null
        : await this.rasa
            .tracker(senderId)
            .then(({ events }) => turnsFromEvents(events ?? []).pop() ?? null)
            .catch(() => null);
      const user = incoming.user && {
        id: incoming.user.id,
        username: incoming.user.username,
        firstName: incoming.user.first_name,
      };
      await this.messages.insertMany([
        {
          channel: 'telegram',
          senderId,
          from: 'user',
          text: incoming.text,
          intent: turn?.intent ?? null,
          actions: turn?.actions.map((action) => action.name),
          user,
          error,
        },
        ...replies
          .filter((reply) => reply.text || reply.image)
          .map((reply) => ({
            channel: 'telegram',
            senderId,
            from: 'bot',
            text: reply.text ?? reply.image,
          })),
      ]);
    } catch (recordError) {
      this.logger.warn(`Không lưu được hội thoại: ${recordError.message}`);
    }
  }
}
