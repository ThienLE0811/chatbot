import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { CreateNlu } from './dto/create-nlu.dto';
import { UpdateNlu } from './dto/update-nlu.dto';
import { NluService } from './nlu.service';

@Controller('Nlu')
export class NluController {
  constructor(private readonly service: NluService) {}

  @Get('/getList')
  async index() {
    return await this.service.findAll();
  }

  @Get(':id')
  async find(@Param('id') id: string) {
    return await this.service.findOne(id);
  }

  @Post('/create')
  async create(@Body() createNlu: CreateNlu) {
    return await this.service.create(createNlu);
  }

  @Put('/update/:id')
  async update(@Param('id') id: string, @Body() updateNlu: UpdateNlu) {
    return await this.service.update(id, updateNlu);
  }

  @Delete('/delete/:id')
  async delete(@Param('id') id: string) {
    return await this.service.delete(id);
  }
}
