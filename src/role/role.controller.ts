import { Body, Controller, Get, Param, Post, Put,HttpCode, HttpStatus, Delete, Req, Res } from '@nestjs/common';
import { CreateRole } from './dto/create-role.dto';
import { UpdateRole } from './dto/update-role.dto';
import { RoleService } from './role.service';
import { JwtService } from '@nestjs/jwt';


@Controller('role')
export class RolesController {
  constructor(
    private readonly service: RoleService) {}
  

   @Get('/getList')
  async index() {
    return await this.service.findAll();
  }

  @Get(':id')
  async find(@Param('id') id: string) {
    return await this.service.findOne(id);
  }

  @Post('/register')
  async create(@Body() CreateRole: CreateRole) {
    console.log(123)
    return await this.service.create(CreateRole);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() UpdateRole: UpdateRole) {
    return await this.service.update(id, UpdateRole);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return await this.service.delete(id);
  }
}











