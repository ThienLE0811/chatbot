
import { Injectable,HttpException, HttpStatus, Res, NotFoundException, ValidationError  } from '@nestjs/common';
import { Request, Response } from 'express';

import { InjectModel } from '@nestjs/mongoose';
import { Model, NumberSchemaDefinition } from 'mongoose';
import { CreateUser } from './dto/create-user.dto';
import { UpdateUser } from './dto/update-user.dto';
import { User, UserDocument } from './schema/users.schema';
import { LoginDto } from './dto/login.dto';
import { compare } from 'bcryptjs';
import jwt_decode from "jwt-decode";
import { sign } from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { Role, RoleDocument } from 'src/auth/role_services/schema/role.schema';
import { async } from 'rxjs';
require('dotenv').config()

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly model: Model<UserDocument>,
  @InjectModel(Role.name) private modelRole: Model<RoleDocument>,
  ) {}



  async findAll(): Promise<User[]> {
    return await this.model.find().exec();
  }

  async findOne(id: string): Promise<User> {
    let userRoleName = await this.model.findById(id).exec().then(data=> {
      return data.userRoleName});
    const role = await this.modelRole.findOne({roleType: userRoleName})
    const userRole = role.roleAction
    const userGroup = role.description

    console.log("userGroup:: ",userGroup)

    await this.model.findOneAndUpdate(
    { _id: id },
    { userRole: userRole },
    {userGroup: userGroup}
  ).exec();
    return await this.model.findById(id).exec();
  }

  async login( loginDto: LoginDto) {
    const { userName, password} = loginDto;
    let errCode =  HttpStatus.UNAUTHORIZED


    const user = await this.model.findOne({ userName }).lean();
    console.log(user)
    if (!user?.userName) {
       throw new HttpException('Tài khoản không tồn tại!',  errCode);
    }
 
    const isMatch = await compare(password, user.password);

    if (!isMatch) {
      throw new HttpException('Mật khẩu không chính xác!', errCode);
    }

    const accessToken = await this.createToken(user)
    // const refreshToken = await this.generateRefreshToken(user)

    delete user.password;
    return {
      data: {
      userInfo: user,
      token: {
        access_token: accessToken
      },
      statusCode: HttpStatus.OK
      } 
    }
  }

  async createToken(user:LoginDto) {
    const payload = { username: user.userName };
    console.log(process.env.SECRET_KEY)
    const token =  sign(payload,process.env.SECRET_KEY, { expiresIn: '1h', audience: user.userName});
    const decodeData: any = jwt_decode(token);

    return {token,decodeData}
  }

// async generateRefreshToken(user: User) {
//   const refreshToken = uuid();
//   user.refreshToken = refreshToken;
//   await this.model.updateOne({ _id: user._id }, { refreshToken });
//   return refreshToken;
// }

  async create(createUser: CreateUser): Promise<User> {
    let errCode =  HttpStatus.UNAUTHORIZED
    let saltRounds = 10;
    let hashedPassword = await bcrypt.hash(createUser?.password, saltRounds);
    const userNameCheck = await this.model.findOne({ userName: createUser?.userName });
    async function checkUsernameExists(userName:string) {
      const user = userNameCheck 
      return !!user;
    }

  const userExists = await checkUsernameExists(createUser?.userName);
  
    if (userExists) {
    throw new HttpException('Tên người dùng đã tồn tại!',errCode);
    }
    let userRoleName = createUser?.userRoleName || 'USER'
    console.log("role:: ",userRoleName)
    const role = await this.modelRole.findOne({roleType: userRoleName})
    const userRole = role.roleAction
    const userGroup = role.description
    


    console.log(12)
    return await new this.model({
      ...createUser,
      userRole: userRole,
      userRoleName: "USER",
      userGroup: userGroup,
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


  async update(id: string, updateUser: UpdateUser): Promise<{message: string,statusCode: number,User: User}> {
    // return await this.model.findByIdAndUpdate(id, updateUser).exec();

    // let userRoleName = await this.model.findById(id).exec().then(data=> {
    //   return data.userRoleName});
    // console.log("Name role: ",userRoleName)

    const userRoleName = updateUser.userRoleName
    console.log("Name role: ",userRoleName)

    const role = await this.modelRole.findOne({roleType: userRoleName})

    const userRole = role.roleAction
    const userGroup = role.description
    console.log("userGroup:: ",userGroup)
    const update = await this.model.findByIdAndUpdate(id, {...updateUser,userRole: userRole,userGroup:userGroup,updateAt: Date.now()}, { new: true }).exec();
    
    return {
      message: "Cập nhật thành công",
      statusCode: 200,
      User: update
    }
  }

  // async delete(id: string): Promise<User> {

  //   return await this.model.findByIdAndDelete(id).exec()
  // }

  async delete(id: string): Promise<{ message: string, statusCode: number, user: User }> {
  const deletedUser = await this.model.findByIdAndDelete(id).exec();
  if (!deletedUser) {
    throw new NotFoundException(`Người dùng với id: ${id} not found`);
  }
  return { message: `Xóa thành công người dùng với id là ${id}`, statusCode:200, user: deletedUser };
}

  async getUsersWithRoles(): Promise<User[]> {
  return this.model.find().populate('roles').exec();
}




}