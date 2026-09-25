import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { ALL_PERMISSIONS, Permission } from '../../auth/permissions';

export class UpdateRoleDto {
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập tên nhóm' })
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsArray()
  @ArrayUnique()
  @IsIn(ALL_PERMISSIONS as Permission[], {
    each: true,
    message: 'Có quyền không nằm trong danh mục quyền',
  })
  permissions: Permission[];
}

export class CreateRoleDto extends UpdateRoleDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @Matches(/^[A-Z][A-Z0-9_]{1,31}$/, {
    message:
      'Mã nhóm gồm 2-32 kí tự: chữ in hoa, số, dấu gạch dưới, bắt đầu bằng chữ',
  })
  code: string;
}
