import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  ValidationPipe,
} from '@nestjs/common';
import { ChatTestService } from './chat-test.service';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('chat-test')
export class ChatTestController {
  constructor(private readonly chat: ChatTestService) {}

  /** Bot replies plus what Rasa understood from the message and did about it. */
  @Post('messages')
  @HttpCode(HttpStatus.OK)
  send(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: SendMessageDto,
  ) {
    return this.chat.send(dto.senderId, dto.text);
  }
}
