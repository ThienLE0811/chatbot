
import { Injectable,HttpException, HttpStatus, Res  } from '@nestjs/common';
import { Request, Response } from 'express';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateUser } from './dto/create-user.dto';
import { UpdateUser } from './dto/update-user.dto';
import { User, UserDocument } from './schema/users.schema';
import { LoginDto } from './dto/login.dto';
import { compare } from 'bcryptjs';
import jwt_decode from "jwt-decode";
import { sign } from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
require('dotenv').config()

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly model: Model<UserDocument>) {}

  async findAll(): Promise<User[]> {
    return await this.model.find().exec();
  }

  async findOne(id: string): Promise<User> {
    return await this.model.findById(id).exec();
  }

  async login( loginDto: LoginDto) {
    const { username, password} = loginDto;
    let errCode =  HttpStatus.UNAUTHORIZED


    const user = await this.model.findOne({ username }).lean();
    console.log(user)
    if (!user?.username) {

      throw new HttpException('Tài khoản không tồn tại!',  errCode);
    }
 
    const isMatch = await compare(password, user.password);

    if (!isMatch) {
      throw new HttpException('Mật khẩu không chính xác!', errCode);
    }

    // return {
    //     data: {
    //       username: user?.username,
    //       userRole: user?.userRole,
    //       token: await this.createToken(user,res),
    //       statusCode: HttpStatus.OK
    //     }
    // };
    return {
      data: {
        username: user?.username,
      userRole: user?.userRole,
      token: await this.createToken(user),
      statusCode: HttpStatus.OK
      } 
    }
  }

  async createToken(user:LoginDto) {
    const payload = { username: user.username };
    console.log(process.env.SECRET_KEY)
    const token =  sign(payload,process.env.SECRET_KEY, { expiresIn: '1h', audience: user.username});
    const decodeData: any = jwt_decode(token);
    // res.cookie('token', token, { maxAge: 3600000, httpOnly: true });
    
    return {token,decodeData}
  }

  async create(createUser: CreateUser): Promise<User> {
    let saltRounds = 10;
    let hashedPassword = await bcrypt.hash(createUser?.password, saltRounds);
    console.log(12)
    return await new this.model({
      ...createUser,
       password: hashedPassword,
      createdAt: new Date(),
      updateAt: new Date(),
    }).save();
  }

async logout(req: any, res: any) {
    const token = req.cookies.token;
    console.log("logout")
    if (!token) {
      throw new HttpException('Token not found', HttpStatus.UNAUTHORIZED);
    }

    // Xóa token tại đây. Ví dụ dùng clearCookie
    res.clearCookie('token', {
      httpOnly: true,
      expires: new Date(Date.now()),
      sameSite: 'strict'
    })

    return {
      message: 'Đăng xuất thành công',
    };
  }


  async update(id: string, updateUser: UpdateUser): Promise<User> {
    return await this.model.findByIdAndUpdate(id, updateUser).exec();
    // return await this.model.findByIdAndUpdate(id, {updateUser,updateAt: Date.now()}).exec();
  }

  async delete(id: string): Promise<User> {
    return await this.model.findByIdAndDelete(id).exec();
  }

}