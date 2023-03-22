
import { Injectable,HttpException, HttpStatus, Res  } from '@nestjs/common';
import { Request, Response } from 'express';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { Permission, PermissionDocument } from './schema/permission.schema';
import { compare } from 'bcryptjs';
import jwt_decode from "jwt-decode";
import { sign } from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
require('dotenv').config()

@Injectable()
export class PermissionService {
  constructor(@InjectModel(Permission.name) private readonly model: Model<PermissionDocument>) {}

  async findAll(): Promise<Permission[]> {
    return await this.model.find().exec();
  }

  async findOne(id: string): Promise<Permission> {
    return await this.model.findById(id).exec();
  }

  async create(createPermission: CreatePermissionDto): Promise<Permission> {
    console.log(12)
    return await new this.model({
      ...createPermission,
      createdAt: new Date(),
      updateAt: new Date(),
    }).save();
  }


  async update(id: string, updatePermission: UpdatePermissionDto): Promise<Permission> {
    // return await this.model.findByIdAndUpdate(id, updateUser).exec();
    return await this.model.findByIdAndUpdate(id, {updatePermission,updateAt: Date.now()}).exec();
  }

  async delete(id: string): Promise<Permission> {
    return await this.model.findByIdAndDelete(id).exec();
  }

}