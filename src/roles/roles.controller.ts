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
  RequireAnyPermission,
  RequirePermissions,
} from '../auth/access.decorators';
import { PERMISSION_MODULES } from '../auth/permissions';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';
import { RolesService } from './roles.service';

const validation = new ValidationPipe({ transform: true, whitelist: true });

@Controller('roles')
@RequirePermissions('roles.read')
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  /** Also needed by the user form, to pick a user's role. */
  @Get()
  @RequireAnyPermission('roles.read', 'users.write')
  list() {
    return this.roles.list();
  }

  /** The permission catalog, grouped by module, for the role editor. */
  @Get('permissions')
  permissions() {
    return PERMISSION_MODULES;
  }

  @Get(':id')
  find(@Param('id') id: string) {
    return this.roles.findOne(id);
  }

  @Post()
  @RequirePermissions('roles.write')
  create(
    @Body(validation) dto: CreateRoleDto,
    @CurrentUser() actor: Principal,
  ) {
    return this.roles.create(dto, actor);
  }

  @Put(':id')
  @RequirePermissions('roles.write')
  update(
    @Param('id') id: string,
    @Body(validation) dto: UpdateRoleDto,
    @CurrentUser() actor: Principal,
  ) {
    return this.roles.update(id, dto, actor);
  }

  @Delete(':id')
  @RequirePermissions('roles.write')
  delete(@Param('id') id: string, @CurrentUser() actor: Principal) {
    return this.roles.delete(id, actor);
  }
}
