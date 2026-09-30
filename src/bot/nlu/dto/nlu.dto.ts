import { Transform } from 'class-transformer';
import { IsArray, IsNotEmpty, IsString, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class NluDto {
  /** Code of an existing intent. */
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng chọn ý định' })
  intent: string;

  @IsArray()
  @IsString({ each: true })
  @MaxLength(1000, { each: true })
  examples: string[];
}
