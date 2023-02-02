import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { CreateUser } from './dto/create-user.dto';
import { UpdateUser } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

   @Get()
  async index() {
    return await this.service.findAll();
  }

  @Get(':id')
  async find(@Param('id') id: string) {
    return await this.service.findOne(id);
  }

  @Post()
  async create(@Body() createUser: CreateUser) {
    return await this.service.create(createUser);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateUser: UpdateUser) {
    return await this.service.update(id, updateUser);
  }
}







