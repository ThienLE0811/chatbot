import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class SendMessageDto {
  /** Chosen by the client; a new id starts a new conversation. */
  @IsString()
  @Matches(/^[\w-]{1,64}$/, {
    message: 'senderId chỉ gồm chữ, số, "_" hoặc "-" (tối đa 64 ký tự)',
  })
  senderId: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Tin nhắn không được để trống' })
  @MaxLength(1000)
  text: string;
}
