import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ResponsesDocument = HydratedDocument<Responses>;

@Schema()
export class Responses {
  @Prop({ required: true, unique: true, index: true })
  title: string;

  @Prop()
  data: [];

  @Prop()
  createdAt: Date;

  @Prop()
  updateAt: Date;
}

export const ResponsesSchema = SchemaFactory.createForClass(Responses);
