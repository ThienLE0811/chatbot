import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class UserDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;
}
