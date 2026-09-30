import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import {
  ConversationMessage,
  ConversationMessageSchema,
} from './schemas/conversation-message.schema';

/** Stores real conversations (written by channels such as Telegram) and serves them for review. */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ConversationMessage.name, schema: ConversationMessageSchema },
    ]),
  ],
  controllers: [ConversationsController],
  providers: [ConversationsService],
  exports: [MongooseModule],
})
export class ConversationsModule {}
