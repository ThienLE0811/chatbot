import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type IntentsDocument = HydratedDocument<Intents>;

/**
 * An intent's name. Its examples are not stored here but in the `nlu`
 * collection Rasa trains on; IntentsService reads and writes them there.
 */
@Schema()
export class Intents {
  @Prop({ required: true, unique: true })
  title: string;

  /** Vietnamese name shown to people, e.g. "Hỏi giờ làm việc". */
  @Prop()
  description: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updateAt: Date;
}

export const IntentsSchema = SchemaFactory.createForClass(Intents);
