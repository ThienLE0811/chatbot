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
import { get } from 'https';
import { CreateIntents } from './dto/create-response.dto';
import { UpdateIntents } from './dto/update-response.dto';
import { IntentsService } from './intents.service';

@Controller('intents')
export class IntentsController {
  constructor(private readonly service: IntentsService) {}

  @Get('/getList')
  async index(@Query('filters') filters: any) {
    console.log('filters::', filters);
    return await this.service.findAll(filters);
  }

  @Get(':id')
  async find(@Param('id') id: string) {
    return await this.service.findOne(id);
  }

  @Post('/create')
  async create(@Body() createIntents: CreateIntents) {
    return await this.service.create(createIntents);
  }

  @Put('/update/:id')
  async update(@Param('id') id: string, @Body() updateIntents: UpdateIntents) {
    return await this.service.update(id, updateIntents);
  }

  @Delete('/delete/:id')
  async delete(@Param('id') id: string) {
    return await this.service.delete(id);
  }
}
