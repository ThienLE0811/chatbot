import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type FormsDocument = HydratedDocument<Forms>;

@Schema()
export class Forms {
  @Prop()
  title: string;

  @Prop({type: []})
  data: { name_data:{type: Object, text: []}};

  @Prop()
  createdAt: Date;

  @Prop()
  updateAt: Date;
}

export const FormsSchema = SchemaFactory.createForClass(Forms);
