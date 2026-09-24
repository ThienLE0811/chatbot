import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramSettings } from './telegram.settings';
import { TelegramUpdate } from './telegram.types';

@Controller('telegram')
export class TelegramController {
  constructor(
    private readonly settings: TelegramSettings,
    private readonly bot: TelegramBotService,
  ) {}

  /**
   * Called by Telegram in webhook mode. Answers at once and handles the
   * update afterwards: Telegram resends updates it considers unanswered.
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  receive(
    @Headers('x-telegram-bot-api-secret-token') secret: string | undefined,
    @Body() update: TelegramUpdate,
  ) {
    if (this.settings.mode !== 'webhook') throw new NotFoundException();
    if (!this.settings.isWebhookSecret(secret)) throw new ForbiddenException();
    void this.bot.dispatch(update);
    return { ok: true };
  }
}
