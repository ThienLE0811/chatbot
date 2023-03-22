import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RolesController } from './role.controller';
import { RoleService } from './role.service';
import { RoleSchema,Role } from './schema/role.schema';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Role.name, schema: RoleSchema },
    ]),
  ],
  controllers: [RolesController ],
  providers: [RoleService,JwtService],
})
export class RolesModule {}