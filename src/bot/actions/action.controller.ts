import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { CreateActions } from './dto/create-action.dto';
import { UpdateActions } from './dto/update-action.dto';
import { ActionsService } from './action.service';

@Controller('actions')
export class ActionsController {
  constructor(private readonly service: ActionsService) {}

  @Get('/getList')
  async index() {
    return await this.service.findAll();
  }

  @Get(':id')
  async find(@Param('id') id: string) {
    return await this.service.findOne(id);
  }

  @Post('/create')
  async create(@Body() createActions: CreateActions) {
    return await this.service.create(createActions);
  }

  @Put('/update/:id')
  async update(@Param('id') id: string, @Body() updateActions: UpdateActions) {
    return await this.service.update(id, updateActions);
  }

  @Delete('/delete/:id')
  async delete(@Param('id') id: string) {
    return await this.service.delete(id);
  }
}
