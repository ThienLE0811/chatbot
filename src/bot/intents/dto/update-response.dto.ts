import { Transform } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { INTENT_TITLE } from './intents.dto';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** Same fields as creating, all optional: only what is sent changes. */
export class UpdateIntents {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Mã ý định không được để trống' })
  @MaxLength(100)
  @Matches(INTENT_TITLE, {
    message: 'Mã ý định chỉ gồm chữ không dấu, số và "_"',
  })
  title?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(1000, { each: true })
  examples?: string[];
}
