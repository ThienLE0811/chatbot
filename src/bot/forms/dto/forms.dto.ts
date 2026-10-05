import { IsArray, IsOptional } from 'class-validator';
import { RecordName } from '../../common-dto';

export class FormsDto {
  @IsOptional()
  @RecordName('Tên form')
  title?: string;

  @IsOptional()
  @IsArray()
  data?: unknown[];
}
