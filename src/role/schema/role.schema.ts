import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RoleDocument = HydratedDocument<Role>;

@Schema()
export class Role {
  @Prop({required:true})
  Rolename: string;

  @Prop({required:true})
  password: string;

  @Prop()
  firstname: string;

  @Prop()
  lastname: string;

  @Prop({required:true})
  email: string;

  @Prop()
  RoleRole: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updateAt: Date;

}

export const RoleSchema = SchemaFactory.createForClass(Role);
