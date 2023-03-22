import { Body, Controller, Get, Param, Post, Put,HttpCode, HttpStatus, Delete, Req, Res } from '@nestjs/common';
import { CreateUser } from './dto/create-user.dto';
import { UpdateUser } from './dto/update-user.dto';
import { LoginDto } from './dto/login.dto';
import { UsersService } from './users.service';
import { JwtService } from '@nestjs/jwt';


@Controller('users')
export class UsersController {
  constructor(
    private readonly service: UsersService ,
    private readonly jwtService: JwtService) {}
  

   @Get('/getList')
  async index() {
    return await this.service.findAll();
  }

  @Get(':id')
  async find(@Param('id') id: string) {
    return await this.service.findOne(id);
  }

  @Post('/register')
  async create(@Body() createUser: CreateUser) {
    console.log(123)
    return await this.service.create(createUser);
  }

  @Put('/update/:id')
  async update(@Param('id') id: string, @Body() updateUser: UpdateUser) {
    return await this.service.update(id, updateUser);
  }

  @Delete('/delete/:id')
  async delete(@Param('id') id: string) {
    return await this.service.delete(id);
  }

  @Post('/login')
  async login(@Body() loginDto: LoginDto) {
    console.log("login")
    
    return await this.service.login(loginDto);
  }

  @Post('/logout')
  async logout(@Req() req: any) {
    // Xóa token trong memory

    return await this.service.logout(req);
  }

  //  @Post('refresh-token')
  // async refreshToken(@Req() req: Request, @Res() res: Response) {
  //   const result = await this.authService.refreshToken(req.cookies.refresh_token);
  //   // Set new access token in cookie
  //   res.cookie('access_token', result.token, { httpOnly: true, maxAge: 3600000 }); // 1 hour
  //   return result.data;
  // }

}











