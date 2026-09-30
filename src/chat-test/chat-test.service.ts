import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  RasaBotMessage,
  RasaClient,
  RasaError,
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
      if (!(error instanceof RasaError)) throw error;
      // The REST channel hides a missing model behind an empty reply; the
      // tracker endpoint is what answers 409 "No agent loaded".
      if ((error.details as { status?: number })?.status === 409) {
        throw new ServiceUnavailableException(
          'Rasa chưa nạp model nào. Hãy train hoặc kích hoạt một model trước.',
        );
      }
      throw new BadGatewayException(error.message);
    }
  }
}
