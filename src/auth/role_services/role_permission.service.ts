
import { Injectable,HttpException, HttpStatus, Res, NotFoundException  } from '@nestjs/common';
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
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { Permission } from './schema/permission.schema';


require('dotenv').config()

// gộp role, Role chung 1 services

@Injectable()

export class RoleService {
  constructor(
    @InjectModel(Role.name) private model: Model<RoleDocument>,
    @InjectModel(Permission.name) private readonly permissionModel: Model<Permission>,
  ) {}

  async findAllRole(): Promise<Role[]> {
    return await this.model.find().exec();
  }

  // async findAll(): Promise<void> {
   
  //   return await this.model.find({name: "User1"}).populate([{path:'permissions',select: 'action', strictPopulate: false }]).then(data=>{console.log(data)}).catch(err=>{console.log(err)});
  // }

  //  async getRoleWithPermissions(id: string): Promise<Role> {
  //   return this.model.findById(id).populate(
  //     [{path: 'permissions',
  //     select: 'actions',
  //     strictPopulate: false
  //     }]
  //   )
  // }
  
  async findOneRole(id: string): Promise<Role> {
    return await this.model.findById(id).exec();
  }
    
 

 async createRole(createRole: CreateRole): Promise<Role> {
    console.log("created")
    return await new this.model({
      ...createRole,
      createdAt: new Date(),
      updateAt: new Date(),
    }).save();
  }
    

  async updateRole(id: string, updateRole: UpdateRole): Promise<Role> {
    // return await this.model.findByIdAndUpdate(id, updateUser).exec();
    return await this.model.findByIdAndUpdate(id, {...updateRole,updateAt: Date.now()}).exec();
  }

  async deleteRole(id: string): Promise<Role> {
    return await this.model.findByIdAndDelete(id).exec();
  }




  //   async findAllPermission(): Promise<Permission[]> {
  //   return await this.permissionModel.find().exec();
  // }

  // async findOnePermission(id: string): Promise<Permission> {
  //   return await this.permissionModel.findById(id).exec();
  // }

  // async createPermission(createPermission: CreatePermissionDto): Promise<Permission> {
  //   console.log("created")
  //   return await new this.permissionModel({
  //     ...createPermission,
  //     createdAt: new Date(),
  //     updateAt: new Date(),
  //   }).save();
  // }

  // async updatePermission(id: string, updatePermission: UpdatePermissionDto): Promise<Permission> {
  //   // return await this.model.findByIdAndUpdate(id, updateUser).exec();
  //   return await this.permissionModel.findByIdAndUpdate(id, {...updatePermission,updateAt: Date.now()}).exec();
  // }

  // async deletePermission(id: string): Promise<Permission> {
  //   return await this.permissionModel.findByIdAndDelete(id).exec();
  // }


}