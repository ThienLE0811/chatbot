import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  ValidationPipe,
} from '@nestjs/common';
import { CreateRules } from './dto/create-rules.dto';
import { UpdateRules } from './dto/update-rules.dto';
import { RulesService } from './rules.service';

const validation = new ValidationPipe({ transform: true, whitelist: true });

@Controller('rules')
export class RulesController {
  constructor(private readonly service: RulesService) {}

  @Get('/getList')
  index() {
    return this.service.findAll();
  }

  @Get(':id')
  find(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post('/create')
  create(@Body(validation) dto: CreateRules) {
    return this.service.create(dto);
  }

  @Put('/update/:id')
  update(@Param('id') id: string, @Body(validation) dto: UpdateRules) {
    return this.service.update(id, dto);
  }

  @Delete('/delete/:id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
