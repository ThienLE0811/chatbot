import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseFloatPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { RequirePermissions } from '../auth/access.decorators';
import { ConversationsService } from './conversations.service';
import { AddToIntentDto, SetReviewDto } from './dto/conversation.dto';
import { DEFAULT_LOW_CONFIDENCE } from './review-filter';

const MAX_PAGE_SIZE = 100;
const validation = new ValidationPipe({ transform: true, whitelist: true });

const pageSize = (limit: number) => Math.min(Math.max(limit, 1), MAX_PAGE_SIZE);
const confidence = (value: number) => Math.min(Math.max(value, 0), 1);

/** Real conversations with the bot (Telegram) and the messages to review. */
@Controller('conversations')
@RequirePermissions('conversations.read')
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  @Get()
  list(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query(
      'maxConfidence',
      new DefaultValuePipe(DEFAULT_LOW_CONFIDENCE),
      ParseFloatPipe,
    )
    maxConfidence: number,
  ) {
    return this.conversations.list(
      pageSize(limit),
      Math.max(skip, 0),
      confidence(maxConfidence),
    );
  }

  /** User messages that were misunderstood or recognised with low confidence. */
  @Get('review')
  reviewQueue(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query(
      'maxConfidence',
      new DefaultValuePipe(DEFAULT_LOW_CONFIDENCE),
      ParseFloatPipe,
    )
    maxConfidence: number,
  ) {
    return this.conversations.reviewQueue(
      pageSize(limit),
      Math.max(skip, 0),
      confidence(maxConfidence),
    );
  }

  @Get(':senderId/messages')
  messages(@Param('senderId') senderId: string) {
    return this.conversations.messagesOf(senderId);
  }

  @Patch('messages/:id/review')
  @RequirePermissions('conversations.review')
  setReview(@Param('id') id: string, @Body(validation) body: SetReviewDto) {
    return this.conversations.setReview(id, body.status);
  }

  /** Adds the message to an intent's examples; training again applies it. */
  @Post('messages/:id/add-to-intent')
  @RequirePermissions('conversations.review')
  @HttpCode(HttpStatus.OK)
  addToIntent(@Param('id') id: string, @Body(validation) body: AddToIntentDto) {
    return this.conversations.addToIntent(id, body.intent);
  }
}
