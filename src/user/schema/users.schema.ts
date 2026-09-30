import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: { createdAt: 'createdAt', updatedAt: 'updateAt' } })
export class User {
  @Prop({ required: true, unique: true })
  userName: string;

  // Không bao giờ trả hash ra ngoài: query mặc định bỏ trường này,
  // chỗ nào cần (login) thì phải select('+password') tường minh.
  @Prop({ required: true, select: false })
  password: string;

  @Prop()
  firstName: string;

  @Prop()
  lastName: string;

  @Prop({ required: true })
  email: string;

  // Mã nhóm quyền (Role.code). Quyền được đọc từ role mỗi request,
  // nên sửa quyền của nhóm có hiệu lực ngay với mọi người trong nhóm.
  @Prop({ required: true, index: true })
  roleCode: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

// select: false không áp dụng cho document vừa save() (API register),
// nên bỏ password cả khi serialize ra JSON.
UserSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    return ret;
  },
});
