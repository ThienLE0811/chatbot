import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { Nlu, NluDocument } from '../nlu/schema/nlu.schema';
import { CreateIntents } from './dto/create-response.dto';
import { UpdateIntents } from './dto/update-response.dto';
import {
  cleanExamples,
  describeConflicts,
  findConflicts,
  mergeExamples,
} from './intent-examples';
import { Intents, IntentsDocument } from './schema/intents.schema';

/** An intent as the intents page shows it, examples included. */
export interface IntentView {
  _id: unknown;
  title: string;
  description?: string;
  examples: string[];
  createdAt?: Date;
  updateAt?: Date;
}

export interface IntentResult {
  message: string;
  statusCode: number;
  intents: IntentView;
}

/**
 * Intents and their examples, edited together on the intents page. The
 * examples are kept in the `nlu` collection, which is what Rasa trains on,
 * so there is one copy and what is typed here is what the bot learns.
 */
@Injectable()
export class IntentsService {
  constructor(
    @InjectModel(Intents.name) private readonly model: Model<IntentsDocument>,
    @InjectModel(Nlu.name) private readonly nlu: Model<NluDocument>,
  ) {}

  async findAll(title?: unknown): Promise<IntentView[]> {
    // Only a plain string filters: `?filters[$ne]=x` must not reach Mongo.
    const filter = typeof title === 'string' && title ? { title } : {};
    const intents = await this.model.find(filter).lean().exec();
    const examples = await this.examplesOf(intents.map((i) => i.title));
    return intents.map((intent) => toView(intent, examples.get(intent.title)));
  }

  async findOne(id: string): Promise<IntentView> {
    const intent = await this.getIntent(id);
    const examples = await this.examplesOf([intent.title]);
    return toView(intent, examples.get(intent.title));
  }

  async create(dto: CreateIntents): Promise<IntentResult> {
    const { title, description } = dto;
    await this.assertTitleFree(title);
    const examples = dto.examples && cleanExamples(dto.examples);
    if (examples) await this.assertExamplesFree(examples, [title]);

    const created = await this.model.create({
      title,
      description,
      createdAt: new Date(),
    });
    if (examples) await this.saveExamples(title, examples);

    return {
      message: 'Tạo mới thành công',
      statusCode: 200,
      intents: await this.findOne(String(created._id)),
    };
  }

  async update(id: string, dto: UpdateIntents): Promise<IntentResult> {
    const current = await this.getIntent(id);
    const title = dto.title ?? current.title;
    const renamed = title !== current.title;
    if (renamed) await this.assertTitleFree(title);
    const examples = dto.examples && cleanExamples(dto.examples);
    if (examples) {
      await this.assertExamplesFree(examples, [current.title, title]);
    }

    await this.model
      .updateOne(
        { _id: id },
        {
          $set: {
            title,
            ...(dto.description !== undefined && {
              description: dto.description,
            }),
            updateAt: new Date(),
          },
        },
      )
      .exec();

    if (renamed) {
      await this.moveExamples(current.title, title, examples);
    } else if (examples) {
      await this.saveExamples(title, examples);
    }

    return {
      message: 'Cập nhật thành công',
      statusCode: 200,
      intents: await this.findOne(id),
    };
  }

  async delete(id: string): Promise<IntentResult> {
    const intent = await this.getIntent(id);
    const examples = await this.examplesOf([intent.title]);
    await this.model.deleteOne({ _id: id }).exec();
    // Left behind, the examples would still be trained under a missing intent.
    await this.nlu.deleteOne({ intent: intent.title }).exec();
    return {
      message: 'Xóa thành công',
      statusCode: 200,
      intents: toView(intent, examples.get(intent.title)),
    };
  }

  private async getIntent(id: string) {
    const intent = isValidObjectId(id)
      ? await this.model.findById(id).lean().exec()
      : null;
    if (!intent) throw new NotFoundException('Không tìm thấy ý định');
    return intent;
  }

  private async assertTitleFree(title: string) {
    if (await this.model.exists({ title })) {
      throw new ConflictException(`Mã ý định "${title}" đã tồn tại`);
    }
  }

  /** `own` are the intent's names, whose examples may be kept. */
  private async assertExamplesFree(examples: string[], own: string[]) {
    if (examples.length === 0) return;
    const others = await this.nlu
      .find({ intent: { $nin: own } }, { intent: 1, examples: 1 })
      .lean()
      .exec();
    const conflicts = findConflicts(examples, others as any[]);
    if (conflicts.length > 0) {
      throw new ConflictException(describeConflicts(conflicts));
    }
  }

  private async examplesOf(titles: string[]): Promise<Map<string, string[]>> {
    const docs = await this.nlu
      .find({ intent: { $in: titles } }, { intent: 1, examples: 1 })
      .lean()
      .exec();
    return new Map(
      docs.map((doc) => [doc.intent, cleanExamples(doc.examples ?? [])]),
    );
  }

  private async saveExamples(title: string, examples: string[]) {
    const now = new Date();
    await this.nlu
      .updateOne(
        { intent: title },
        {
          $set: { examples, updateAt: now },
          $setOnInsert: { createdAt: now },
        },
        { upsert: true },
      )
      .exec();
  }

  /**
   * Renaming carries the examples along. When the page did not send any, the
   * old ones are kept, together with any already filed under the new name.
   */
  private async moveExamples(
    from: string,
    to: string,
    examples: string[] | undefined,
  ) {
    const existing = await this.examplesOf([from, to]);
    const kept =
      examples ??
      mergeExamples(existing.get(from) ?? [], existing.get(to) ?? []);
    await this.nlu.deleteOne({ intent: from }).exec();
    await this.saveExamples(to, kept);
  }
}

function toView(
  intent: Intents & { _id: unknown },
  examples: string[] = [],
): IntentView {
  return {
    _id: intent._id,
    title: intent.title,
    description: intent.description,
    examples,
    createdAt: intent.createdAt,
    updateAt: intent.updateAt,
  };
}
