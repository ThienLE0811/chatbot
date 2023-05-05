import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type NluDocument = HydratedDocument<Nlu>;

@Schema()
export class Nlu {
  @Prop({ required: true })
  intent: string;

  @Prop({ type: [] })
  examples: [];

  @Prop()
  createdAt: Date;

  @Prop()
  updateAt: Date;
}

export const NluSchema = SchemaFactory.createForClass(Nlu);
