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
  

   @Get()
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

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateUser: UpdateUser) {
    return await this.service.update(id, updateUser);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return await this.service.delete(id);
  }

  @Post('/login')
  async login(@Body() loginDto: LoginDto) {
    console.log("login")
    
    return await this.service.login(loginDto);
  }

  @Post('logout')
  async logout(@Req() req: any, @Res() res: any) {
    // Xóa token trong memory
    console.log("res:: ",req.headers.authorization)
    const authorization = req.headers.authorization;
    if(authorization ) {
      const token = req.headers.authorization.split(' ')[1];
    this.jwtService.sign({token}, { expiresIn: 0 });
    }
  
    // Clear cookie
    res.clearCookie('token');
    return res.status(200).send({ message: 'Đăng xuất thành công!' });
  }

}









