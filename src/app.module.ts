import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from './user/users.module';
import { AppController } from './app.controller';
import { BotModule } from './bot/bot.module';
import { BotController } from './bot/bot.controller';
import { RolesModule } from './auth/role_services/role_permission.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/jwt_authGuard/jwt-auth.guard';
import { MongoService } from './app.service';



@Module({
  imports: [MongooseModule.forRoot('mongodb+srv://backend:backend@cluster0.tprqz.mongodb.net/?retryWrites=true&w=majority'), UsersModule,BotModule,RolesModule
],
  controllers: [AppController,BotController],
  providers: [MongoService],
  // providers: [
  //   {
  //     provide: APP_GUARD,
  //     useClass: JwtAuthGuard,
  //   },
  // ],
})
export class AppModule {}
