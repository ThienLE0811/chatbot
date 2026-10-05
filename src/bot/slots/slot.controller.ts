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
import { CreateSlots } from './dto/create-slot.dto';
import { UpdateSlots } from './dto/update-slot.dto';
import { SlotsService } from './slot.service';

const validation = new ValidationPipe({ transform: true, whitelist: true });

@Controller('slots')
export class SlotController {
  constructor(private readonly service: SlotsService) {}

  @Get('getList')
  index(@Query('filters') filters: unknown) {
    return this.service.findAll(filters);
  }

  @Get(':id')
  find(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post('/create')
  create(@Body(validation) dto: CreateSlots) {
    return this.service.create(dto);
  }

  @Put('/update/:id')
  update(@Param('id') id: string, @Body(validation) dto: UpdateSlots) {
    return this.service.update(id, dto);
  }

  @Delete('/delete/:id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
