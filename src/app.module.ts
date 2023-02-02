import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from './user/users.module';
import { AppController } from './app.controller';


@Module({
  //  imports: [MongooseModule.forRoot('mongodb+srv://root:WI4adGHd95rmR4Y7@cluster0.38tfvbj.mongodb.net/acebot'), UsersModule],
  imports: [MongooseModule.forRoot('mongodb+srv://backend:backend@cluster0.tprqz.mongodb.net/?retryWrites=true&w=majority'), UsersModule],
  controllers: [AppController],

})
export class AppModule {}
