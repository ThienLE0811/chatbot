import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';
import { Permission } from './permission.schema';



export type RoleDocument = HydratedDocument<Role>;

@Schema()
export class Role {
  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  // @Prop({type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Permission' }]})
  // permissionsId: Permission[]

  @Prop()
  actionName: string
  
  @Prop({ type: {}})
  roleAction: {} ;

  @Prop()
  roleType: string;
}



export const RoleSchema = SchemaFactory.createForClass(Role);




