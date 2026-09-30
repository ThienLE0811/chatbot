import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

const emptyToUndefined = ({ value }) => (value === '' ? undefined : value);

/**
 * Người dùng tự sửa tài khoản của mình. Không có tên đăng nhập hay nhóm quyền:
 * whitelist bỏ mọi trường khác nên không tự nâng quyền được.
 */
export class UpdateMe {
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

  /** Bỏ trống thì giữ mật khẩu cũ. */
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Mật khẩu mới cần ít nhất 6 kí tự' })
  newPassword?: string;

  /** Bắt buộc khi đổi mật khẩu, để người mượn máy đang đăng nhập không đổi được. */
  @ValidateIf((dto: UpdateMe) => !!dto.newPassword)
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu hiện tại' })
  currentPassword?: string;
}
