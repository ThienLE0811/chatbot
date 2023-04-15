import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PermissionDocument = HydratedDocument<Permission>;

@Schema()
export class Permission {
  @Prop({ required: true })
  module: string;

  @Prop()
  module_name: string;

  @Prop({ required: true , type: [{ type: String }] })
  actions: string[];

}

export const PermissionSchema = SchemaFactory.createForClass(Permission);