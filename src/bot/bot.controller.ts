import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/access.decorators';

@Controller('bots')
export class BotController {
  /** Liveness check. */
  @Get()
  @Public()
  findAll(): string {
    return 'ok bots';
  }
}
