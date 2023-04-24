// import { Controller, Get } from '@nestjs/common';

// @Controller()
// export class AppController {
//   @Get("/")
//   findAll(): string {
//     return 'ok app';
//   }
// }

import { Body, Controller, Get, Post } from '@nestjs/common';
import { MongoService } from './app.service';
interface dataParseMessage {
  text: string,
  message_id: string
}
@Controller()
export class AppController {
  constructor(private readonly mongoService: MongoService) {}

  @Get('/')
  async getCollections(): Promise<string[]> {
    return this.mongoService.listCollections();
  }

  @Get('/getAllData')
  async getAllData(): Promise<string[]> {
    return this.mongoService.getAllData();
  }

  @Post('/parseMessage')
  async parseMessage(@Body() data: dataParseMessage): Promise<string[]> {
    return this.mongoService.parseMessage(data);
  }

}
