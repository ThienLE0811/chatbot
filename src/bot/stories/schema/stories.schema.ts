import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type StoriesDocument = HydratedDocument<Stories>;

@Schema()
export class Stories {
  @Prop({ required: true })
  story: string;

  @Prop({ type: [] })
  steps: [];

  @Prop()
  createdAt: Date;

  @Prop()
  updateAt: Date;
}

export const StoriesSchema = SchemaFactory.createForClass(Stories);
