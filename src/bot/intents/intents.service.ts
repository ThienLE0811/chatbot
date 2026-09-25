import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { NluService } from '../nlu/nlu.service';
import { CreateIntents } from './dto/create-response.dto';
import { UpdateIntents } from './dto/update-response.dto';
import { cleanExamples } from './intent-examples';
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
 * examples are kept by NluService in the `nlu` collection, which is what Rasa
 * trains on, so there is one copy and what is typed here is what the bot
 * learns.
 */
@Injectable()
export class IntentsService {
  constructor(
    @InjectModel(Intents.name) private readonly model: Model<IntentsDocument>,
    private readonly nlu: NluService,
  ) {}

  async findAll(title?: unknown): Promise<IntentView[]> {
    // Only a plain string filters: `?filters[$ne]=x` must not reach Mongo.
    const filter = typeof title === 'string' && title ? { title } : {};
    const intents = await this.model.find(filter).lean().exec();
    const examples = await this.nlu.examplesOf(intents.map((i) => i.title));
    return intents.map((intent) => toView(intent, examples.get(intent.title)));
  }

  async findOne(id: string): Promise<IntentView> {
    const intent = await this.getIntent(id);
    const examples = await this.nlu.examplesOf([intent.title]);
    return toView(intent, examples.get(intent.title));
  }

  async create(dto: CreateIntents): Promise<IntentResult> {
    const { title, description } = dto;
    await this.assertTitleFree(title);
    const examples = dto.examples && cleanExamples(dto.examples);
    if (examples) await this.nlu.assertExamplesFree(examples, [title]);

    const created = await this.model.create({
      title,
      description,
      createdAt: new Date(),
    });
    if (examples) await this.nlu.saveExamples(title, examples);

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
      await this.nlu.assertExamplesFree(examples, [current.title, title]);
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
      await this.nlu.moveExamples(current.title, title, examples);
    } else if (examples) {
      await this.nlu.saveExamples(title, examples);
    }

    return {
      message: 'Cập nhật thành công',
      statusCode: 200,
      intents: await this.findOne(id),
    };
  }

  async delete(id: string): Promise<IntentResult> {
    const intent = await this.getIntent(id);
    const examples = await this.nlu.examplesOf([intent.title]);
    await this.model.deleteOne({ _id: id }).exec();
    // Left behind, the examples would still be trained under a missing intent.
    await this.nlu.deleteExamples(intent.title);
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
