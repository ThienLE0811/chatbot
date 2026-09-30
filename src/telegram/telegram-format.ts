import type { RasaBotMessage } from '../training/rasa/rasa.client';
import type {
  InlineKeyboardMarkup,
  TelegramUpdate,
  TelegramUser,
} from './telegram.types';

/** Telegram rejects longer message texts. */
export const MAX_TEXT_LENGTH = 4096;
/** Telegram rejects longer button callback data. */
export const MAX_CALLBACK_DATA_BYTES = 64;
/** sendMessage needs a text, so buttons without one get this. */
export const BUTTONS_ONLY_TEXT = 'Mời bạn chọn:';

export type OutgoingMessage =
  | { kind: 'text'; text: string; keyboard?: InlineKeyboardMarkup }
  | { kind: 'photo'; url: string; keyboard?: InlineKeyboardMarkup };

/** A user message or button press, reduced to what the bot needs. */
export interface IncomingMessage {
  chatId: number;
  /** Undefined for messages without text, e.g. stickers or photos. */
  text: string | undefined;
  user: TelegramUser | undefined;
  /** Set for button presses, which must be acknowledged. */
  callbackQueryId?: string;
}

/** Null for updates the bot ignores, such as messages from other bots. */
export function parseUpdate(update: TelegramUpdate): IncomingMessage | null {
  const query = update.callback_query;
  if (query) {
    return {
      chatId: query.message?.chat.id ?? query.from.id,
      text: query.data,
      user: query.from,
      callbackQueryId: query.id,
    };
  }
  const message = update.message;
  if (!message || message.from?.is_bot) return null;
  return {
    chatId: message.chat.id,
    text: message.text,
    user: message.from,
  };
}

/** True for /start, also in the /start@bot_name and /start <param> forms. */
export function isStartCommand(text: string): boolean {
  return /^\/start(@\w+)?(\s|$)/.test(text.trim());
}

/** Splits at a line break or space so no chunk exceeds `max` characters. */
export function splitText(text: string, max = MAX_TEXT_LENGTH): string[] {
  const chunks: string[] = [];
  let rest = text;
  while (rest.length > max) {
    const window = rest.slice(0, max);
    const cut = Math.max(window.lastIndexOf('\n'), window.lastIndexOf(' '));
    const end = cut > 0 ? cut : max;
    chunks.push(rest.slice(0, end));
    rest = rest.slice(end).replace(/^\s+/, '');
  }
  if (rest) chunks.push(rest);
  return chunks;
}

function fitsCallbackData(value: string): boolean {
  return (
    value.length > 0 && Buffer.byteLength(value) <= MAX_CALLBACK_DATA_BYTES
  );
}

/**
 * One button per row. The payload (e.g. /affirm) goes back to Rasa when the
 * button is pressed; a payload too long for Telegram falls back to the
 * button title, which Rasa then has to understand as plain text.
 */
function toKeyboard(
  buttons: RasaBotMessage['buttons'],
): InlineKeyboardMarkup | undefined {
  const rows = (buttons ?? [])
    .map((button) => {
      const data = [button.payload, button.title].find(
        (value) => typeof value === 'string' && fitsCallbackData(value),
      );
      return data ? [{ text: button.title || data, callback_data: data }] : [];
    })
    .filter((row) => row.length > 0);
  return rows.length ? { inline_keyboard: rows } : undefined;
}

/** Turns Rasa replies into Telegram messages; `custom` payloads are not supported. */
export function toTelegramMessages(
  replies: RasaBotMessage[],
): OutgoingMessage[] {
  const messages: OutgoingMessage[] = [];
  for (const reply of replies) {
    const keyboard = toKeyboard(reply.buttons);
    const text = reply.text?.trim();

    if (reply.image) {
      // Attach the buttons to the photo only when no text follows it.
      messages.push({
        kind: 'photo',
        url: reply.image,
        keyboard: text ? undefined : keyboard,
      });
    }
    if (text) {
      const chunks = splitText(text);
      chunks.forEach((chunk, index) =>
        messages.push({
          kind: 'text',
          text: chunk,
          keyboard: index === chunks.length - 1 ? keyboard : undefined,
        }),
      );
    } else if (keyboard && !reply.image) {
      messages.push({ kind: 'text', text: BUTTONS_ONLY_TEXT, keyboard });
    }
  }
  return messages;
}
