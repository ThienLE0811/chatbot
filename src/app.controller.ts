import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  ValidationPipe,
} from '@nestjs/common';
import { RequirePermissions } from './auth/access.decorators';
import { MongoService } from './app.service';
import { ChatTestService } from './chat-test/chat-test.service';
import { ParseMessageDto } from './chat-test/dto/parse-message.dto';
import { RawResponse } from './common/api-response';
import { TrainingDataExporter } from './training/data/training-data.exporter';

const validation = new ValidationPipe({ transform: true, whitelist: true });

@Controller()
export class AppController {
  constructor(
    private readonly mongoService: MongoService,
    private readonly exporter: TrainingDataExporter,
    private readonly chat: ChatTestService,
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
  @RawResponse()
  async getAllData(): Promise<string> {
    const dataset = await this.exporter.load();
    return this.exporter.toRasaYaml(dataset);
  }

  /** Rasa's reading of one sentence: intent, confidence, entities. */
  @Post('/parseMessage')
  @RequirePermissions('chat_test.use')
  @HttpCode(HttpStatus.OK)
  parseMessage(@Body(validation) dto: ParseMessageDto) {
    return this.chat.parse(dto.text);
  }
}
