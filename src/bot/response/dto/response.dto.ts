import { IsArray, IsObject, IsOptional } from 'class-validator';
import { RecordName } from '../../common-dto';

export class ResponsesDto {
  @RecordName('Tên phản hồi')
  title: string;

  /** Rasa response variants, e.g. `{ text }` or `{ text, buttons }`. */
  @IsOptional()
  @IsArray()
  @IsObject({ each: true, message: 'Mỗi phản hồi phải là một object' })
  data?: Record<string, unknown>[];
}
