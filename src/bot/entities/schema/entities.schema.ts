import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type EntitiesDocument = HydratedDocument<Entities>;

@Schema()
export class Entities {
  @Prop({required:true})
  nameEntities: string;

  @Prop({type: {}})
  dataEntities: {};

  @Prop()
  createdAt: Date;

  @Prop()
  updateAt: Date;
}

export const EntitiesSchema = SchemaFactory.createForClass(Entities);
