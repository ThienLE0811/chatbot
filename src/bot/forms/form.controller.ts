import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  ValidationPipe,
} from '@nestjs/common';
import { CreateForms } from './dto/create-response.dto';
import { UpdateForms } from './dto/update-response.dto';
import { FormsService } from './form.service';

const validation = new ValidationPipe({ transform: true, whitelist: true });

@Controller('forms')
export class FormsController {
  constructor(private readonly service: FormsService) {}

  @Get()
  index() {
    return this.service.findAll();
  }

  @Get(':id')
  find(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body(validation) dto: CreateForms) {
    return this.service.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body(validation) dto: UpdateForms) {
    return this.service.update(id, dto);
  }
}
