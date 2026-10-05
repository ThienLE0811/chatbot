import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { CreateResponses } from './dto/create-response.dto';
import { UpdateResponses } from './dto/update-response.dto';
import { ResponsesService } from './response.service';

const validation = new ValidationPipe({ transform: true, whitelist: true });

@Controller('responses')
export class ResponsesController {
  constructor(private readonly service: ResponsesService) {}

  @Get('/getList')
  index(@Query('filters') filters: unknown) {
    return this.service.findAll(filters);
  }

  @Get(':id')
  find(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post('/create')
  create(@Body(validation) dto: CreateResponses) {
    return this.service.create(dto);
  }

  @Put('/update/:id')
  update(@Param('id') id: string, @Body(validation) dto: UpdateResponses) {
    return this.service.update(id, dto);
  }

  @Delete('/delete/:id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
