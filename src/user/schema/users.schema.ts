import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';
import { Role } from 'src/auth/role_services/schema/role.schema';

export type UserDocument = HydratedDocument<User>;

@Schema()
export class User {
  @Prop({required:true})
  userName: string;

  @Prop({required:true})
  password: string;

  @Prop()
  firstName: string;

  @Prop()
  lastName: string;

  @Prop({required:true})
  email:  string;

  @Prop({type: mongoose.Schema.Types.String, ref: 'Role'})
  userRoleName: Role

  @Prop({type: mongoose.Schema.Types.String, ref: 'Role'})
  userGroup: Role

  @Prop({ type: Object })
  userRole: { [key: string]: boolean };

  @Prop()
  createdAt: Date;

  @Prop()
  updateAt: Date;

}


export const UserSchema = SchemaFactory.createForClass(User);
