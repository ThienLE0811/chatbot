import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from './user/users.module';
import { AppController } from './app.controller';
import { BotModule } from './bot/bot.module';
import { BotController } from './bot/bot.controller';
import { AuthModule } from './auth/auth.module';
import { RolesModule } from './roles/roles.module';
import { MongoService } from './app.service';
import { HistoryModule } from './training/history/history.module';
import { TrainingModule } from './training/training.module';
import { ChatTestModule } from './chat-test/chat-test.module';
import { TelegramModule } from './telegram/telegram.module';
import { ConversationsModule } from './conversations/conversations.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGODB_URI'),
      }),
    }),
    // Registers the global AccessGuard: every route needs a login unless
    // marked @Public(), plus the permissions it declares.
    AuthModule,
    UsersModule,
    RolesModule,
    BotModule,
    HistoryModule,
    TrainingModule,
    ChatTestModule,
    TelegramModule,
    ConversationsModule,
  ],
  controllers: [AppController, BotController],
  providers: [MongoService],
})
export class AppModule {}
