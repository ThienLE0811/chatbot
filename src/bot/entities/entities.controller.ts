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
import { CreateEntities } from './dto/create-entities.dto';
import { UpdateEntities } from './dto/update-entities.dto';
import { EntitiesService } from './entities.service';

const validation = new ValidationPipe({ transform: true, whitelist: true });

@Controller('entities')
export class EntitiesController {
  constructor(private readonly service: EntitiesService) {}

  @Get('/getList')
  index(@Query('filters') filters: unknown) {
    return this.service.findAll(filters);
  }

  @Get(':id')
  find(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post('/create')
  create(@Body(validation) dto: CreateEntities) {
    return this.service.create(dto);
  }

  @Put('/update/:id')
  update(@Param('id') id: string, @Body(validation) dto: UpdateEntities) {
    return this.service.update(id, dto);
  }

  @Delete('/delete/:id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
