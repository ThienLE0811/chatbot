import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ActionsDocument = HydratedDocument<Actions>;

@Schema()
export class Actions {
  @Prop()
  action: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updateAt: Date;
}

export const ActionsSchema = SchemaFactory.createForClass(Actions);
