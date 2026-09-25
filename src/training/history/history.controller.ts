import { Controller, Get } from '@nestjs/common';
import { RequirePermissions } from '../../auth/access.decorators';
import { HistoryService } from './history.service';

@Controller('history')
@RequirePermissions('train.read')
export class HistoryController {
  constructor(private readonly service: HistoryService) {}

  @Get('/getList')
  async index() {
    return await this.service.findAll();
  }
}
