import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SlotsDocument = HydratedDocument<Slots>;

@Schema()
export class Slots {
  @Prop()
  title: string;

  @Prop({type: []})
  data: { name_data:{type: Object, text: []}};

  @Prop()
  createdAt: Date;

  @Prop()
  updateAt: Date;
}

export const SlotsSchema = SchemaFactory.createForClass(Slots);
