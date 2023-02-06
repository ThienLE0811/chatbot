import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { CreateResponses } from './dto/create-response.dto';
import { UpdateResponses } from './dto/update-response.dto';
import { ResponsesService } from './response.service';

@Controller('responses')
export class ResponsesController {
  constructor(private readonly service: ResponsesService) {}

   @Get()
  async index() {
    return await this.service.findAll();
  }

  @Get(':id')
  async find(@Param('id') id: string) {
    return await this.service.findOne(id);
  }

  @Post()
  async create(@Body() createResponses: CreateResponses) {
    return await this.service.create(createResponses);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateResponses: UpdateResponses) {
    return await this.service.update(id, updateResponses);
  }
}







