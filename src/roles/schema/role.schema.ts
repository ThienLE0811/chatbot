import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RoleDocument = HydratedDocument<Role>;

@Schema({ timestamps: { createdAt: 'createdAt', updatedAt: 'updateAt' } })
export class Role {
  /** Stable key users reference (User.roleCode); cannot change once created. */
  @Prop({ required: true, unique: true, sparse: true })
  code: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  /** Keys from PERMISSION_MODULES. */
  @Prop({ type: [String], default: [] })
  permissions: string[];

  /** Built-in role (ADMIN, VIEWER): cannot be deleted. */
  @Prop({ default: false })
  isSystem: boolean;
}

export const RoleSchema = SchemaFactory.createForClass(Role);
