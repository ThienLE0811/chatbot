import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type IntentsDocument = HydratedDocument<Intents>;

@Schema()
export class Intents {
  @Prop({required:true})
  title: string;

  @Prop({type: []})
  examples: [];

  @Prop()
  description: string;
  
  @Prop()
  createdAt: Date;

  @Prop()
  updateAt: Date;
}

export const IntentsSchema = SchemaFactory.createForClass(Intents);
