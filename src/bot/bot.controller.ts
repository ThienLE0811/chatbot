import { Controller, Get } from '@nestjs/common';

@Controller("bots")
export class BotController {
  @Get()
  findAll(): string {
    return 'ok bots';
  }
}