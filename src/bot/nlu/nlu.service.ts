import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import {
  cleanExamples,
  describeConflicts,
  findConflicts,
  mergeExamples,
} from '../intents/intent-examples';
import { Intents, IntentsDocument } from '../intents/schema/intents.schema';
import { CreateNlu } from './dto/create-nlu.dto';
import { UpdateNlu } from './dto/update-nlu.dto';
import { Nlu, NluDocument } from './schema/nlu.schema';

/** An nlu document as the Nlu page shows it. */
export interface NluView {
  _id: unknown;
  intent: string;
  /** The intent's Vietnamese name, e.g. "Hỏi giờ làm việc". */
  intentDescription?: string;
  examples: string[];
  createdAt?: Date;
  updateAt?: Date;
}

/**
 * Owns the `nlu` collection: the examples Rasa trains on, one document per
 * intent. Both the Nlu page and the intents page go through here, so the
 * examples are cleaned and checked the same way wherever they are edited.
 */
@Injectable()
export class NluService {
  constructor(
    @InjectModel(Nlu.name) private readonly model: Model<NluDocument>,
    @InjectModel(Intents.name)
    private readonly intents: Model<IntentsDocument>,
  ) {}

  async findAll(intent?: unknown): Promise<NluView[]> {
    // Only a plain string filters: `?filters[$ne]=x` must not reach Mongo.
    const filter = typeof intent === 'string' && intent ? { intent } : {};
    const docs = await this.model.find(filter).lean().exec();
    const names = await this.intentNames(docs.map((doc) => doc.intent));
    return docs.map((doc) => toView(doc, names.get(doc.intent)));
  }

  async findOne(id: string): Promise<NluView> {
    const doc = await this.getDoc(id);
    const names = await this.intentNames([doc.intent]);
    return toView(doc, names.get(doc.intent));
  }

  async create(
    dto: CreateNlu,
  ): Promise<{ message: string; statusCode: number; Nlus: NluView }> {
    const { intent } = dto;
    await this.assertIntentFree(intent);
    const examples = cleanExamples(dto.examples);
    await this.assertExamplesFree(examples, [intent]);

    const now = new Date();
    const created = await this.model.create({
      intent,
      examples,
      createdAt: now,
      updateAt: now,
    });
    return {
      message: 'Tạo mới thành công',
      statusCode: 200,
      Nlus: await this.findOne(String(created._id)),
    };
  }

  async update(
    id: string,
    dto: UpdateNlu,
  ): Promise<{ message: string; statusCode: number; Nlu: NluView }> {
    const current = await this.getDoc(id);
    const intent = dto.intent ?? current.intent;
    if (intent !== current.intent) await this.assertIntentFree(intent);
    const examples = dto.examples && cleanExamples(dto.examples);
    if (examples) await this.assertExamplesFree(examples, [intent]);

    await this.model
      .updateOne(
        { _id: id },
        {
          $set: {
            intent,
            ...(examples && { examples }),
            updateAt: new Date(),
          },
        },
      )
      .exec();
    return {
      message: 'Cập nhật thành công',
      statusCode: 200,
      Nlu: await this.findOne(id),
    };
  }

  async delete(
    id: string,
  ): Promise<{ message: string; statusCode: number; Nlu: NluView }> {
    const doc = await this.findOne(id);
    await this.model.deleteOne({ _id: id }).exec();
    return { message: 'Xóa thành công', statusCode: 200, Nlu: doc };
  }

  /** Examples of each of `intents`, cleaned; intents without any are left out. */
  async examplesOf(intents: string[]): Promise<Map<string, string[]>> {
    const docs = await this.model
      .find({ intent: { $in: intents } }, { intent: 1, examples: 1 })
      .lean()
      .exec();
    return new Map(
      docs.map((doc) => [doc.intent, cleanExamples(doc.examples ?? [])]),
    );
  }

  /**
   * Refuses examples another intent already has: the model could not tell
   * the two apart. `own` are the intent's names, whose examples may be kept.
   */
  async assertExamplesFree(examples: string[], own: string[]) {
    if (examples.length === 0) return;
    const others = await this.model
      .find({ intent: { $nin: own } }, { intent: 1, examples: 1 })
      .lean()
      .exec();
    const conflicts = findConflicts(examples, others as any[]);
    if (conflicts.length > 0) {
      throw new ConflictException(describeConflicts(conflicts));
    }
  }

  /** Replaces the examples of `intent`, creating its document if needed. */
  async saveExamples(intent: string, examples: string[]) {
    const now = new Date();
    await this.model
      .updateOne(
        { intent },
        {
          $set: { examples, updateAt: now },
          $setOnInsert: { createdAt: now },
        },
        { upsert: true },
      )
      .exec();
  }

  /**
   * Files the examples of a renamed intent under its new code. When none
   * were sent, the old ones are kept, together with any already filed there.
   */
  async moveExamples(from: string, to: string, examples?: string[]) {
    const existing = await this.examplesOf([from, to]);
    const kept =
      examples ??
      mergeExamples(existing.get(from) ?? [], existing.get(to) ?? []);
    await this.model.deleteOne({ intent: from }).exec();
    await this.saveExamples(to, kept);
  }

  async deleteExamples(intent: string) {
    await this.model.deleteOne({ intent }).exec();
  }

  private async getDoc(id: string) {
    const doc = isValidObjectId(id)
      ? await this.model.findById(id).lean().exec()
      : null;
    if (!doc) throw new NotFoundException('Không tìm thấy dữ liệu NLU');
    return doc;
  }

  /** The intent must exist and not have its examples document yet. */
  private async assertIntentFree(intent: string) {
    if (!(await this.intents.exists({ title: intent }))) {
      throw new NotFoundException(`Không tìm thấy ý định "${intent}"`);
    }
    if (await this.model.exists({ intent })) {
      throw new ConflictException(
        `Ý định "${intent}" đã có danh sách câu mẫu, hãy sửa dòng đó thay vì tạo mới`,
      );
    }
  }

  private async intentNames(codes: string[]): Promise<Map<string, string>> {
    const intents = await this.intents
      .find({ title: { $in: codes } }, { title: 1, description: 1 })
      .lean()
      .exec();
    return new Map(
      intents
        .filter((intent) => intent.description)
        .map((intent) => [intent.title, intent.description]),
    );
  }
}

function toView(
  doc: Nlu & { _id: unknown },
  intentDescription?: string,
): NluView {
  return {
    _id: doc._id,
    intent: doc.intent,
    intentDescription,
    examples: cleanExamples(doc.examples ?? []),
    createdAt: doc.createdAt,
    updateAt: doc.updateAt,
  };
}
