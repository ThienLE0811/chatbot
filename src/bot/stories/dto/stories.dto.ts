import { IsArray, IsObject, IsOptional } from 'class-validator';
import { RecordName } from '../../common-dto';

export class StoriesDto {
  @RecordName('Tên story')
  story: string;

  /** Rasa steps, e.g. `{ intent }` then `{ action }`. */
  @IsOptional()
  @IsArray()
  @IsObject({ each: true, message: 'Mỗi bước phải là một object' })
  steps?: Record<string, unknown>[];
}
