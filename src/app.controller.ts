// import { Controller, Get } from '@nestjs/common';

// @Controller()
// export class AppController {
//   @Get("/")
//   findAll(): string {
//     return 'ok app';
//   }
// }

import { Controller, Get } from '@nestjs/common';
import { MongoService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly mongoService: MongoService) {}

  @Get('/')
  async getCollections(): Promise<string[]> {
    return this.mongoService.listCollections();
  }

  @Get('/getAllData')
  async etAllData(): Promise<string[]> {
    return this.mongoService.getAllData();
  }
}
