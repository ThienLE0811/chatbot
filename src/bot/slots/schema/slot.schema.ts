import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SlotsDocument = HydratedDocument<Slots>;

@Schema()
export class Slots {

  @Prop({required:true})
  nameSlot: string

  @Prop({ type: []})
  mapping: [];

  // @Prop()
  // autoFill: boolean

  @Prop()
  type: string

  @Prop()
  createdAt: Date;

  @Prop()
  updateAt: Date;
}

export const SlotsSchema = SchemaFactory.createForClass(Slots);
