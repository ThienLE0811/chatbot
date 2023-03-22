import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PermissionDocument = HydratedDocument<Permission>;

@Schema()
export class Permission {
  @Prop({ required: true })
  module: string;

  @Prop({ required: true })
  module_name: string;

  @Prop([String])
  actions: string[];

}

export const PermissionSchema = SchemaFactory.createForClass(Permission);
