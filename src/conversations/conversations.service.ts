import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, isValidObjectId } from 'mongoose';
import { ReviewAction } from './dto/conversation.dto';
import {
  DEFAULT_LOW_CONFIDENCE,
  ReviewReason,
  needsReviewFilter,
  reviewReason,
} from './review-filter';
import {
  ConversationMessage,
  ConversationMessageDocument,
} from './schemas/conversation-message.schema';

/** A long conversation shows its most recent messages. */
const MAX_MESSAGES = 500;

export interface ConversationSummary {
  senderId: string;
  channel: string;
  user: { id?: number; username?: string; firstName?: string } | null;
  messageCount: number;
  needsReview: number;
  lastMessage: { from: 'user' | 'bot'; text: string | null };
  startedAt: Date;
  lastAt: Date;
}

export type ReviewItem = ConversationMessage & {
  _id: unknown;
  reason: ReviewReason;
};

export interface AddToIntentResult {
  intent: string;
  text: string;
  /** The intent already had this example, so nothing was added. */
  alreadyExisted: boolean;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

@Injectable()
export class ConversationsService {
  constructor(
    @InjectModel(ConversationMessage.name)
    private readonly messages: Model<ConversationMessageDocument>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  /** Conversations, the most recently active first. */
  async list(
    limit: number,
    skip: number,
    maxConfidence = DEFAULT_LOW_CONFIDENCE,
  ): Promise<{ items: ConversationSummary[]; total: number }> {
    const [result] = await this.messages.aggregate([
      { $sort: { createdAt: 1, _id: 1 } },
      {
        $group: {
          _id: '$senderId',
          channel: { $last: '$channel' },
          // Only user messages carry `user`; merging skips the bot's.
          user: { $mergeObjects: '$user' },
          messageCount: { $sum: 1 },
          lastFrom: { $last: '$from' },
          lastText: { $last: '$text' },
          startedAt: { $first: '$createdAt' },
          lastAt: { $last: '$createdAt' },
        },
      },
      { $sort: { lastAt: -1 } },
      {
        $facet: {
          items: [{ $skip: skip }, { $limit: limit }],
          total: [{ $count: 'count' }],
        },
      },
    ]);

    const groups: any[] = result?.items ?? [];
    const reviewCounts = await this.messages.aggregate([
      {
        $match: {
          ...needsReviewFilter(maxConfidence),
          senderId: { $in: groups.map((group) => group._id) },
        },
      },
      { $group: { _id: '$senderId', count: { $sum: 1 } } },
    ]);
    const needsReview = new Map(
      reviewCounts.map((row) => [row._id, row.count]),
    );

    return {
      total: result?.total[0]?.count ?? 0,
      items: groups.map((group) => ({
        senderId: group._id,
        channel: group.channel,
        user: group.user && Object.keys(group.user).length ? group.user : null,
        messageCount: group.messageCount,
        needsReview: needsReview.get(group._id) ?? 0,
        lastMessage: { from: group.lastFrom, text: group.lastText ?? null },
        startedAt: group.startedAt,
        lastAt: group.lastAt,
      })),
    };
  }

  /** Oldest first; only the latest MAX_MESSAGES of a long conversation. */
  async messagesOf(senderId: string) {
    const latest = await this.messages
      .find({ senderId })
      .sort({ createdAt: -1, _id: -1 })
      .limit(MAX_MESSAGES)
      .lean();
    return latest.reverse();
  }

  /** User messages to look at, newest first. */
  async reviewQueue(
    limit: number,
    skip: number,
    maxConfidence = DEFAULT_LOW_CONFIDENCE,
  ): Promise<{ items: ReviewItem[]; total: number }> {
    const filter = needsReviewFilter(maxConfidence);
    const [items, total] = await Promise.all([
      this.messages
        .find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.messages.countDocuments(filter),
    ]);
    return {
      total,
      items: items.map((item) => ({ ...item, reason: reviewReason(item) })),
    };
  }

  async setReview(id: string, action: ReviewAction) {
    await this.findUserMessage(id);
    const update =
      action === 'open'
        ? { $unset: { review: 1 } }
        : { $set: { review: { status: action, at: new Date() } } };
    return this.messages.findByIdAndUpdate(id, update, { new: true }).lean();
  }

  /**
   * Adds the message text to the examples of `intent`, the ones Rasa trains
   * on. Refused when another intent already has the same example, since
   * that would teach Rasa two answers for one sentence.
   */
  async addToIntent(id: string, intent: string): Promise<AddToIntentResult> {
    const message = await this.findUserMessage(id);
    const text = message.text?.trim();
    if (!text) {
      throw new BadRequestException('Tin nhắn này không có nội dung chữ');
    }

    const db = this.connection.db;
    const known = await db.collection('intents').countDocuments({
      title: intent,
    });
    if (!known) {
      throw new NotFoundException(`Không tìm thấy ý định "${intent}"`);
    }

    const sameText = new RegExp(`^\\s*${escapeRegex(text)}\\s*$`, 'i');
    const owners = await db
      .collection('nlu')
      .find({ examples: sameText }, { projection: { intent: 1 } })
      .toArray();
    const other = owners.find((owner) => owner.intent !== intent);
    if (other) {
      throw new ConflictException(
        `"${text}" đang là câu mẫu của ý định "${other.intent}"`,
      );
    }

    const alreadyExisted = owners.length > 0;
    if (!alreadyExisted) {
      const now = new Date();
      await db.collection('nlu').updateOne(
        { intent },
        {
          $push: { examples: text },
          $set: { updateAt: now },
          $setOnInsert: { createdAt: now },
        },
        { upsert: true },
      );
    }
    await this.messages.updateOne(
      { _id: id },
      { $set: { review: { status: 'added', intent, at: new Date() } } },
    );
    return { intent, text, alreadyExisted };
  }

  private async findUserMessage(id: string) {
    const message = isValidObjectId(id)
      ? await this.messages.findById(id).lean()
      : null;
    if (!message) throw new NotFoundException('Không tìm thấy tin nhắn');
    if (message.from !== 'user') {
      throw new BadRequestException('Chỉ xem lại được tin nhắn của người dùng');
    }
    return message;
  }
}
