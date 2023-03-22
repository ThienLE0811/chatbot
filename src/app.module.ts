import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from './user/users.module';
import { AppController } from './app.controller';
import { BotModule } from './bot/bot.module';
import { BotController } from './bot/bot.controller';
import { PermissionModule } from './core_permission/permission.module';
import { PermissionController } from './core_permission/permission.controller';
import { RolesModule } from './role/role.module';


@Module({
  imports: [MongooseModule.forRoot('mongodb+srv://backend:backend@cluster0.tprqz.mongodb.net/?retryWrites=true&w=majority'), UsersModule,BotModule,PermissionModule,RolesModule
],
  controllers: [AppController,BotController],

})
export class AppModule {}
