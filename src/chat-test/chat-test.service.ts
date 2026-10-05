import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  RasaBotMessage,
  RasaClient,
  RasaError,
  RasaParseResult,
} from '../training/rasa/rasa.client';
import { ChatTurn, turnsFromEvents } from './tracker-turns';

export interface ChatTestReply {
  replies: RasaBotMessage[];
  /** Null when the tracker holds no user message, e.g. Rasa dropped it. */
  turn: ChatTurn | null;
}

@Injectable()
export class ChatTestService {
  constructor(private readonly rasa: RasaClient) {}

  async send(senderId: string, text: string): Promise<ChatTestReply> {
    try {
      const replies = await this.rasa.sendMessage(senderId, text);
      // The webhook answers after the message is fully handled, so the
      // tracker already holds this turn.
      const tracker = await this.rasa.tracker(senderId);
      const turns = turnsFromEvents(tracker.events ?? []);
      return { replies, turn: turns[turns.length - 1] ?? null };
    } catch (error) {
      throw toHttpError(error);
    }
  }

  /** Intent and entities the model finds in a text, outside any conversation. */
  async parse(text: string): Promise<RasaParseResult> {
    try {
      return await this.rasa.parse(text);
    } catch (error) {
      throw toHttpError(error);
    }
  }
}

function toHttpError(error: unknown): unknown {
  if (!(error instanceof RasaError)) return error;
  // The REST channel hides a missing model behind an empty reply; the
  // tracker and parse endpoints are what answer 409 "No agent loaded".
  if ((error.details as { status?: number })?.status === 409) {
    return new ServiceUnavailableException(
      'Rasa chưa nạp model nào. Hãy train hoặc kích hoạt một model trước.',
    );
  }
  return new BadGatewayException(error.message);
}
