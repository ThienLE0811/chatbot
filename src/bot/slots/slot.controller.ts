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
import { CreateSlots } from './dto/create-slot.dto';
import { UpdateSlots } from './dto/update-slot.dto';
import { SlotsService } from './slot.service';

@Controller('slots')
export class SlotController {
  constructor(private readonly service: SlotsService) {}

  @Get('getList')
  async index(@Query('filters') filters: any) {
    return await this.service.findAll(filters);
  }

  @Get(':id')
  async find(@Param('id') id: string) {
    return await this.service.findOne(id);
  }

  @Post('/create')
  async create(@Body() createSlots: CreateSlots) {
    return await this.service.create(createSlots);
  }

  @Put('/update/:id')
  async update(@Param('id') id: string, @Body() updateSlots: UpdateSlots) {
    return await this.service.update(id, updateSlots);
  }

  @Delete('/delete/:id')
  async delete(@Param('id') id: string) {
    return await this.service.delete(id);
  }
}
