import { Transform } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

/** Rasa intent names: no spaces or accents, e.g. `ask_working_hours`. */
export const INTENT_TITLE = /^[A-Za-z0-9_]+$/;

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class IntentsDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Mã ý định không được để trống' })
  @MaxLength(100)
  @Matches(INTENT_TITLE, {
    message: 'Mã ý định chỉ gồm chữ không dấu, số và "_"',
  })
  title: string;

  /** Vietnamese name shown to people. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  description?: string;

  /** Saved to the intent's `nlu` document; left as is when omitted. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(1000, { each: true })
  examples?: string[];
}
