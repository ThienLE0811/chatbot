import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';

export type ConversationMessageDocument = HydratedDocument<ConversationMessage>;

/**
 * What a designer decided about a user message:
 * - wrong: the bot misunderstood it, though its confidence looked fine
 * - added: added as an example of `intent`
 * - ignored: nothing to learn from it
 */
export type ReviewStatus = 'wrong' | 'added' | 'ignored';

export interface MessageReview {
  status: ReviewStatus;
  /** The intent the message was added to, for `added`. */
  intent?: string;
  at: Date;
}

/**
 * One message of a real conversation with the bot, from either side. User
 * messages keep the intent Rasa recognised, so low-confidence and fallback
 * messages can later be found and added to the training data.
 */
@Schema({
  collection: 'conversation_messages',
  timestamps: { createdAt: true, updatedAt: false },
})
export class ConversationMessage {
  @Prop({ type: String, required: true, enum: ['telegram'] })
  channel: 'telegram';

  /** The Rasa sender id, e.g. telegram-123456789. */
  @Prop({ required: true })
  senderId: string;

  @Prop({ type: String, required: true, enum: ['user', 'bot'] })
  from: 'user' | 'bot';

  @Prop()
  text?: string;

  @Prop({ type: SchemaTypes.Mixed })
  intent?: { name: string; confidence: number } | null;

  @Prop({ type: [String], default: undefined })
  actions?: string[];

  @Prop({ type: SchemaTypes.Mixed })
  user?: { id: number; username?: string; firstName?: string };

  /** Why the bot could not answer, e.g. Rasa was unreachable. */
  @Prop()
  error?: string;

  @Prop({ type: SchemaTypes.Mixed })
  review?: MessageReview;

  createdAt?: Date;
}

export const ConversationMessageSchema =
  SchemaFactory.createForClass(ConversationMessage);
ConversationMessageSchema.index({ senderId: 1, createdAt: 1 });
ConversationMessageSchema.index({ channel: 1, createdAt: -1 });
ConversationMessageSchema.index({ from: 1, createdAt: -1 });
