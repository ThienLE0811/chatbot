import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CreateStories } from './dto/create-stories.dto';
import { UpdateStories } from './dto/update-stories.dto';
import { StoriesService } from './stories.service';

@Controller('stories')
export class StoriesController {
  constructor(private readonly service: StoriesService) {}

  @Get('/getList')
  async index(@Query('filters') filters: any) {
    try {
      return await this.service.findAll(filters);
    } catch (error) {
      console.log(error);
    }
  }

  @Get(':id')
  async find(@Param('id') id: string) {
    return await this.service.findOne(id);
  }

  @Post('/create')
  async create(@Body() createStories: CreateStories) {
    return await this.service.create(createStories);
  }

  @Put('/update/:id')
  async update(@Param('id') id: string, @Body() updateStories: UpdateStories) {
    return await this.service.update(id, updateStories);
  }

  @Delete('/delete/:id')
  async delete(@Param('id') id: string) {
    return await this.service.delete(id);
  }
}
