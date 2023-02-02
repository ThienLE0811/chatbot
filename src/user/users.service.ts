
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateUser } from './dto/create-user.dto';
import { UpdateUser } from './dto/update-user.dto';
import { User, UserDocument } from './schema/users.schema';



@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly model: Model<UserDocument>) {}


  async findAll(): Promise<User[]> {
    return await this.model.find().exec();
  }

  async findOne(id: string): Promise<User> {
    return await this.model.findById(id).exec();
  }

  async create(createUser: CreateUser): Promise<User> {
    return await new this.model({
      ...createUser,
      createdAt: new Date(),
    }).save();
  }

  async update(id: string, updateUser: UpdateUser): Promise<User> {
    return await this.model.findByIdAndUpdate(id, updateUser).exec();
  }

  // async delete(id: string): Promise<User> {
  //   return await this.model.findByIdAndDelete(id).exec();
  // }

}