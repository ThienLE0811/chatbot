import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CreateResponses } from './dto/create-response.dto';
import { UpdateResponses } from './dto/update-response.dto';
import { ResponsesService } from './response.service';

@Controller('responses')
export class ResponsesController {
  constructor(private readonly service: ResponsesService) {}

  @Get('/getList')
  async index(@Query('filters') filters: any) {
    return await this.service.findAll(filters);
  }

  @Get(':id')
  async find(@Param('id') id: string) {
    return await this.service.findOne(id);
  }

  @Post('/create')
  async create(@Body() createResponses: CreateResponses) {
    return await this.service.create(createResponses);
  }

  @Put('/update/:id')
  async update(
    @Param('id') id: string,
    @Body() updateResponses: UpdateResponses,
  ) {
    return await this.service.update(id, updateResponses);
  }

  @Delete('/delete/:id')
  async delete(@Param('id') id: string) {
    return await this.service.delete(id);
  }
}
