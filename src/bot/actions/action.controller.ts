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
import { CreateActions } from './dto/create-action.dto';
import { UpdateActions } from './dto/update-action.dto';
import { ActionsService } from './action.service';

const validation = new ValidationPipe({ transform: true, whitelist: true });

@Controller('actions')
export class ActionsController {
  constructor(private readonly service: ActionsService) {}

  @Get('/getList')
  index() {
    return this.service.findAll();
  }

  @Get(':id')
  find(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post('/create')
  create(@Body(validation) dto: CreateActions) {
    return this.service.create(dto);
  }

  @Put('/update/:id')
  update(@Param('id') id: string, @Body(validation) dto: UpdateActions) {
    return this.service.update(id, dto);
  }

  @Delete('/delete/:id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
