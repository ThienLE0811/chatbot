import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RulesDocument = HydratedDocument<Rules>;

@Schema()
export class Rules {
  @Prop({ required: true })
  rule: string;

  @Prop({ type: [] })
  steps: [];

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const RulesSchema = SchemaFactory.createForClass(Rules);
