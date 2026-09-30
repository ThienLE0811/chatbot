import { Module } from '@nestjs/common';
import { ConversationsModule } from '../conversations/conversations.module';
import { TrainingModule } from '../training/training.module';
import { TelegramApi } from './telegram.api';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramController } from './telegram.controller';
import { TelegramLifecycleService } from './telegram-lifecycle.service';
import { TelegramSettings } from './telegram.settings';

/** Telegram bot bridged to Rasa; stays off until TELEGRAM_BOT_TOKEN is set. */
@Module({
  imports: [TrainingModule, ConversationsModule],
  controllers: [TelegramController],
  providers: [
    TelegramSettings,
    TelegramApi,
    TelegramBotService,
    TelegramLifecycleService,
  ],
})
export class TelegramModule {}
