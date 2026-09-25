import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type HistoryDocument = HydratedDocument<History>;

@Schema()
export class History {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop()
  status: string;

  @Prop()
  createdAt: Date;
}

export const HistorySchema = SchemaFactory.createForClass(History);
