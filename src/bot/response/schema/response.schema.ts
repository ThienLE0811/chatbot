import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ResponsesDocument = HydratedDocument<Responses>;

@Schema()
export class Responses {
  @Prop()
  title: string;

  @Prop({type: []})
  data: { };

  @Prop()
  createdAt: Date;

  @Prop()
  updateAt: Date;
}

export const ResponsesSchema = SchemaFactory.createForClass(Responses);
