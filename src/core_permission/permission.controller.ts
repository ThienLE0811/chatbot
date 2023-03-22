import { Body, Controller, Get, Param, Post, Put,HttpCode, HttpStatus, Delete, Req, Res } from '@nestjs/common';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { PermissionService  } from './permission.service';
import { JwtService } from '@nestjs/jwt';


@Controller('permission')
export class PermissionController {
  constructor(
    private readonly service: PermissionService 
    ) {}
  

   @Get('/getList')
  async index() {
    return await this.service.findAll();
  }

  @Get(':id')
  async find(@Param('id') id: string) {
    return await this.service.findOne(id);
  }

  @Post('')
  async create(@Body() createUser: CreatePermissionDto ) {
    console.log(123)
    return await this.service.create(createUser);
  }

  @Put('/update/:id')
  async update(@Param('id') id: string, @Body() updateUser: UpdatePermissionDto) {
    return await this.service.update(id, updateUser);
  }

  @Delete('/delete/:id')
  async delete(@Param('id') id: string) {
    return await this.service.delete(id);
  }


}











