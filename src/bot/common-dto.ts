import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** The name a record is known by in Rasa (`utter_greet`, `customer_name`...). */
export function RecordName(label: string) {
  return applyDecorators(
    Transform(trim),
    IsString(),
    IsNotEmpty({ message: `${label} không được để trống` }),
    MaxLength(200),
  );
}

/** Free text shown to people only. */
export function Description() {
  return applyDecorators(Transform(trim), IsString(), MaxLength(1000));
}
