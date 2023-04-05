import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserSchema,User } from './schema/users.schema';
import { JwtService } from '@nestjs/jwt';
import { RolesModule } from 'src/auth/role_services/role_permission.module';
import { RoleService } from 'src/auth/role_services/role_permission.service';
import { RolesController } from 'src/auth/role_services/role_permission.controller';
import { Role, RoleSchema } from 'src/auth/role_services/schema/role.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Role.name, schema: RoleSchema },
    ]),RolesModule
  ],
  controllers: [UsersController ],
  providers: [UsersService,JwtService],
})
export class UsersModule {}