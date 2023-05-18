// import { Controller, Get } from '@nestjs/common';

// @Controller()
// export class AppController {
//   @Get("/")
//   findAll(): string {
//     return 'ok app';
//   }
// }

import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { MongoService } from './app.service';
import { zip } from 'rxjs/operators';
interface dataParseMessage {
  text: string;
  message_id: string;
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

  @Post('/callback_url')
  async callBackUrl(
    @Body() body: any,
    @Headers() header: Record<string, unknown>,
    @Req() request: Record<string, unknown>,
    @Res() res: Record<string, unknown>,
    // @Param('Files') File: Record<string, unknown>,
  ): Promise<string[]> {
    console.log('body: ', body);
    console.log('headers ', header);

    return body;
  }
}
