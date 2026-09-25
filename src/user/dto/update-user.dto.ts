import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Every field is optional: only what is sent changes. */
export class UpdateUser {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email?: string;

  // Không bắt buộc: admin chỉ gửi khi muốn đặt lại mật khẩu cho người dùng
  // (ví dụ người dùng quên mật khẩu). Bỏ trống thì giữ mật khẩu cũ.
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Mật khẩu cần ít nhất 6 kí tự' })
  password?: string;

  @IsOptional()
  @IsString()
  roleCode?: string;
}
