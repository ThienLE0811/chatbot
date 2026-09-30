import { Module } from '@nestjs/common';
import { TrainingModule } from '../training/training.module';
import { ChatTestController } from './chat-test.controller';
import { ChatTestService } from './chat-test.service';

@Module({
  imports: [TrainingModule],
  controllers: [ChatTestController],
  providers: [ChatTestService],
})
export class ChatTestModule {}
