import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type NluDocument = HydratedDocument<Nlu>;

/** The examples Rasa trains on for one intent. */
@Schema({ collection: 'nlu' })
export class Nlu {
  /** Code of the intent, one document per intent. */
  @Prop({ required: true, unique: true })
  intent: string;

  @Prop({ type: [String] })
  examples: string[];

  @Prop()
  createdAt: Date;

  @Prop()
  updateAt: Date;
}

export const NluSchema = SchemaFactory.createForClass(Nlu);
