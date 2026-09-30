import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** `open` clears an earlier decision, putting the message back in review. */
export const REVIEW_ACTIONS = ['wrong', 'ignored', 'open'] as const;
export type ReviewAction = (typeof REVIEW_ACTIONS)[number];

export class SetReviewDto {
  @IsIn(REVIEW_ACTIONS, {
    message: `status phải là một trong: ${REVIEW_ACTIONS.join(', ')}`,
  })
  status: ReviewAction;
}

export class AddToIntentDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Hãy chọn một ý định' })
  @MaxLength(200)
  intent: string;
}
