import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { CreateEntities} from './dto/create-entities.dto';
import { UpdateEntities} from './dto/update-entities.dto';
import { EntitiesService} from './entities.service';

@Controller('entities')
export class EntitiesController {
  constructor(private readonly service: EntitiesService) {}

   @Get('/getList')
  async index() {
    return await this.service.findAll();
  }

  @Get(':id')
  async find(@Param('id') id: string) {
    return await this.service.findOne(id);
  }

  @Post()
  async create(@Body() createEntities: CreateEntities) {
    return await this.service.create(createEntities);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateEntities: UpdateEntities) {
    return await this.service.update(id, updateEntities);
  }

  @Delete('/delete/:id')
  async delete(@Param('id') id: string) {
    return await this.service.delete(id);
  }
}







