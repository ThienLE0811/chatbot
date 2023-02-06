import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import {  CreateSlots } from './dto/create-slot.dto';
import {  UpdateSlots } from './dto/update-slot.dto';
import {  SlotsService } from './slot.service';

@Controller('slots')
export class SlotController {
  constructor(private readonly service: SlotsService) {}

   @Get()
  async index() {
    return await this.service.findAll();
  }

  @Get(':id')
  async find(@Param('id') id: string) {
    return await this.service.findOne(id);
  }

  @Post()
  async create(@Body() createSlots: CreateSlots) {
    return await this.service.create(createSlots);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateSlots: UpdateSlots) {
    return await this.service.update(id, updateSlots);
  }
}







