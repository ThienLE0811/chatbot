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
import {
  CurrentUser,
  Principal,
  RequirePermissions,
} from '../auth/access.decorators';
import { CreateUser } from './dto/create-user.dto';
import { UpdateUser } from './dto/update-user.dto';
import { UsersService } from './users.service';

const validation = new ValidationPipe({ transform: true, whitelist: true });

/** Đăng nhập, đăng ký, thông tin của chính mình: xem AuthController. */
@Controller('users')
@RequirePermissions('users.read')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get('/getList')
  async index() {
    return await this.service.findAll();
  }

  @Get(':id')
  async find(@Param('id') id: string) {
    return await this.service.findOne(id);
  }

  @Post('/create')
  @RequirePermissions('users.write')
  async create(
    @Body(validation) createUser: CreateUser,
    @CurrentUser() actor: Principal,
  ) {
    return await this.service.createByAdmin(createUser, actor);
  }

  @Put('/update/:id')
  @RequirePermissions('users.write')
  async update(
    @Param('id') id: string,
    @Body(validation) updateUser: UpdateUser,
    @CurrentUser() actor: Principal,
  ) {
    return await this.service.update(id, updateUser, actor);
  }

  @Delete('/delete/:id')
  @RequirePermissions('users.write')
  async delete(@Param('id') id: string, @CurrentUser() actor: Principal) {
    return await this.service.delete(id, actor);
  }
}
