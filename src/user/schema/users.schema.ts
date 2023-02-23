import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema()
export class User {
  @Prop({required:true})
  username: string;

  @Prop({required:true})
  password: string;

  @Prop()
  firstname: string;

  @Prop()
  lastname: string;

  @Prop({required:true})
  email: string;

  @Prop()
  userRole: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updateAt: Date;

}

export const UserSchema = SchemaFactory.createForClass(User);
