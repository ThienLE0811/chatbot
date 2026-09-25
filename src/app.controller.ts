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
import { Public, RequirePermissions } from './auth/access.decorators';
import { MongoService } from './app.service';
import { TrainingDataExporter } from './training/data/training-data.exporter';
import { zip } from 'rxjs/operators';
interface dataParseMessage {
  text: string;
  message_id: string;
}
@Controller()
export class AppController {
  constructor(
    private readonly mongoService: MongoService,
    private readonly exporter: TrainingDataExporter,
  ) {}

  @Get('/')
  @RequirePermissions('dialogue.read')
  async getCollections(): Promise<string[]> {
    return this.mongoService.listCollections();
  }

  /**
   * Preview of the YAML sent to Rasa. Training no longer happens here; it is
   * queued with POST /train.
   */
  @Get('/getAllData')
  @RequirePermissions('train.read')
  @Header('Content-Type', 'application/yaml; charset=utf-8')
  async getAllData(): Promise<string> {
    const dataset = await this.exporter.load();
    return this.exporter.toRasaYaml(dataset);
  }

  @Post('/parseMessage')
  @RequirePermissions('chat_test.use')
  async parseMessage(@Body() data: dataParseMessage): Promise<string[]> {
    return this.mongoService.parseMessage(data);
  }

  /** Called by Rasa, which has no login; it only logs what it receives. */
  @Post('/callback_url')
  @Public()
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
