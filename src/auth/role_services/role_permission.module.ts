import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RolesController } from './role_permission.controller';
import { RoleService } from './role_permission.service';
import { RoleSchema,Role } from './schema/role.schema';
import { JwtService } from '@nestjs/jwt';
import { Permission, PermissionSchema } from './schema/permission.schema';
// import { Permission, PermissionSchema } from 'src/core_permission/schema/permission.schema';
// import { PermissionController } from 'src/core_permission/permission.controller';
// import { PermissionService } from 'src/core_permission/permission.service';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Role.name, schema: RoleSchema },
      { name: Permission.name, schema: PermissionSchema },
    ]),
  ],
  controllers: [RolesController ],
  providers: [RoleService],
})
export class RolesModule {}