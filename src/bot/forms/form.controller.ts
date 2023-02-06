import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { CreateForms} from './dto/create-response.dto';
import { UpdateForms} from './dto/update-response.dto';
import { FormsService} from './form.service';

@Controller('forms')
export class FormsController {
  constructor(private readonly service: FormsService) {}

   @Get()
  async index() {
    return await this.service.findAll();
  }

  @Get(':id')
  async find(@Param('id') id: string) {
    return await this.service.findOne(id);
  }

  @Post()
  async create(@Body() createForms: CreateForms) {
    return await this.service.create(createForms);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateForms: UpdateForms) {
    return await this.service.update(id, updateForms);
  }
}







