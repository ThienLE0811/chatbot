import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';
import { UserDto } from './user.dto';

/** Public sign-up: the role is always SIGNUP_ROLE, whatever the client sends. */
export class RegisterUser extends UserDto {
  @Matches(/^[a-zA-Z0-9_.-]{3,50}$/, {
    message:
      'Tên đăng nhập gồm 3-50 kí tự: chữ không dấu, số, dấu chấm, gạch ngang, gạch dưới',
  })
  userName: string;

  @IsString()
  @MinLength(6, { message: 'Mật khẩu cần ít nhất 6 kí tự' })
  password: string;
}

/** Created by an admin, who picks the role. */
export class CreateUser extends RegisterUser {
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng chọn nhóm quyền' })
  roleCode: string;
}
