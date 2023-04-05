import { Body, Controller, Get, Param, Post, Put,HttpCode, HttpStatus, Delete, Req, Res } from '@nestjs/common';
import { CreateRole } from './dto/create-role.dto';
import { UpdateRole } from './dto/update-role.dto';
import { RoleService } from './role_permission.service';
import { JwtService } from '@nestjs/jwt';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';


@Controller('roleService')
export class RolesController {
  constructor(
    private readonly service: RoleService) {} 

   @Get('role/getList')
  async findAllRole() {
    return await this.service.findAllRole();
  }

  @Get('role/:id')
  async findRole(@Param('id') id: string) {

    return await this.service.findOneRole(id);
  }

  @Post('role/create')
  async createRole(@Body() createRole: CreateRole) {
    console.log(123)
    
    return await this.service.createRole(createRole);
  }

  @Put('role/update/:id')
  async updateRole(@Param('id') id: string, @Body() updateRole: UpdateRole) {
    return await this.service.updateRole(id, updateRole);
  }

  @Delete('role/delete/:id')
  async deleteRole(@Param('id') id: string) {
    return await this.service.deleteRole(id);
  }

  // @Get('permission/getList')
  // async finAllPermission() {
  //   return await this.service.findAllPermission();
  // }

  // @Get('permission/:id')
  // async findPermission(@Param('id') id: string) {
  //   return await this.service.findOnePermission(id);
  // }

  // @Post('permission/create')
  // async createPermission(@Body() createUser: CreatePermissionDto ) {
  //   console.log(123)
  //   return await this.service.createPermission(createUser);
  // }

  // @Put('permission/update/:id')
  // async updatePermission(@Param('id') id: string, @Body() updateUser: UpdatePermissionDto) {
  //   return await this.service.updatePermission(id, updateUser);
  // }

  // @Delete('permission/delete/:id')
  // async deletePermission(@Param('id') id: string) {
  //   return await this.service.deletePermission(id);
  // }
  



}











