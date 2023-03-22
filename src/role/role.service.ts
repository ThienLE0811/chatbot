
import { Injectable,HttpException, HttpStatus, Res  } from '@nestjs/common';
import { Request, Response } from 'express';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateRole } from './dto/create-role.dto';
import { UpdateRole } from './dto/update-role.dto';
import { Role, RoleDocument } from './schema/role.schema';
import { compare } from 'bcryptjs';
import jwt_decode from "jwt-decode";
import { sign } from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
require('dotenv').config()

@Injectable()
export class RoleService {
  constructor(@InjectModel(Role.name) private readonly model: Model<RoleDocument>) {}

  async findAll(): Promise<Role[]> {
    return await this.model.find().exec();
  }

  async findOne(id: string): Promise<Role> {
    return await this.model.findById(id).exec();
  }

  async create(createRole: CreateRole): Promise<Role> {
    let saltRounds = 10;
    let hashedPassword = await bcrypt.hash(createRole?.password, saltRounds);
    console.log(12)
    return await new this.model({
      ...createRole,
       password: hashedPassword,
      createdAt: new Date(),
      updateAt: new Date(),
    }).save();
  }

async logout(req: any) {
    console.log("req::: ",req)
    console.log("logout")
    
    return {
      message: 'Đăng xuất thành công',
    };
}


  async update(id: string, updateRole: UpdateRole): Promise<Role> {
    // return await this.model.findByIdAndUpdate(id, updateRole).exec();
    return await this.model.findByIdAndUpdate(id, {updateRole,updateAt: Date.now()}).exec();
  }

  async delete(id: string): Promise<Role> {
    return await this.model.findByIdAndDelete(id).exec();
  }

}