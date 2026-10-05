import {
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { RecordName } from '../../common-dto';

export class SlotsDto {
  @RecordName('Tên slot')
  nameSlot: string;

  /** Rasa slot mappings, e.g. `{ type: 'from_entity', entity }`. */
  @IsOptional()
  @IsArray()
  @IsObject({ each: true, message: 'Mỗi mapping phải là một object' })
  mapping?: Record<string, unknown>[];

  /** Rasa slot type: text, bool, categorical, float, list, any. */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  type?: string;
}
