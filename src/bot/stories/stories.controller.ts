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
import { CreateStories } from './dto/create-stories.dto';
import { UpdateStories } from './dto/update-stories.dto';
import { StoriesService } from './stories.service';

const validation = new ValidationPipe({ transform: true, whitelist: true });

@Controller('stories')
export class StoriesController {
  constructor(private readonly service: StoriesService) {}

  @Get('/getList')
  index(@Query('filters') filters: unknown) {
    return this.service.findAll(filters);
  }

  @Get(':id')
  find(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post('/create')
  create(@Body(validation) dto: CreateStories) {
    return this.service.create(dto);
  }

  @Put('/update/:id')
  update(@Param('id') id: string, @Body(validation) dto: UpdateStories) {
    return this.service.update(id, dto);
  }

  @Delete('/delete/:id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
