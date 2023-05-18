import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { CreateRules } from './dto/create-rules.dto';
import { UpdateRules } from './dto/update-rules.dto';
import { RulesService } from './rules.service';

@Controller('rules')
export class RulesController {
  constructor(private readonly service: RulesService) {}

  @Get('/getList')
  async index() {
    try {
      return await this.service.findAll();
    } catch (error) {
      console.log(error);
    }
  }

  @Get(':id')
  async find(@Param('id') id: string) {
    return await this.service.findOne(id);
  }

  @Post('/create')
  async create(@Body() createRules: CreateRules) {
    return await this.service.create(createRules);
  }

  @Put('/update/:id')
  async update(@Param('id') id: string, @Body() updateRules: UpdateRules) {
    return await this.service.update(id, updateRules);
  }

  @Delete('/delete/:id')
  async delete(@Param('id') id: string) {
    return await this.service.delete(id);
  }
}
