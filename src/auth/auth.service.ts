import { HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RolesService } from '../roles/roles.service';
import { SIGNUP_ROLE } from '../roles/system-roles';
import { RegisterUser } from '../user/dto/create-user.dto';
import { LoginDto } from '../user/dto/login.dto';
import { UpdateMe } from '../user/dto/update-me.dto';
import { UsersService } from '../user/users.service';
import { Principal } from './access.decorators';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly roles: RolesService,
    private readonly jwt: JwtService,
  ) {}

  async login({ userName, password }: LoginDto) {
    const user = await this.users.findForLogin(userName);
    // Cùng một thông báo cho cả hai trường hợp để không lộ tên đăng nhập nào có thật.
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Tên đăng nhập hoặc mật khẩu không đúng');
    }
    const token = await this.jwt.signAsync({
      sub: String(user._id),
      username: user.userName,
    });
    const userInfo = { ...user };
    delete userInfo.password;
    return {
      data: {
        userInfo,
        token: { access_token: { token } },
        statusCode: HttpStatus.OK,
      },
    };
  }

  /** Public sign-up always lands in SIGNUP_ROLE; an admin can move them later. */
  register(dto: RegisterUser) {
    return this.users.create(dto, SIGNUP_ROLE);
  }

  /** The user behind a token, with their role's permissions as of now. */
  async principal(userId: string): Promise<Principal | null> {
    const user = await this.users.findById(userId);
    if (!user) return null;
    return {
      id: String(user._id),
      userName: user.userName,
      roleCode: user.roleCode,
      permissions: await this.roles.permissionsOf(user.roleCode),
    };
  }

  async me(principal: Principal) {
    const [user, role] = await Promise.all([
      this.users.findOne(principal.id),
      this.roles.findByCode(principal.roleCode),
    ]);
    return {
      user,
      role: role ? { code: role.code, name: role.name } : null,
      permissions: principal.permissions,
    };
  }

  /** Tự sửa tài khoản của mình; trả về /auth/me mới để web cập nhật ngay. */
  async updateMe(principal: Principal, dto: UpdateMe) {
    await this.users.updateOwn(principal.id, dto);
    return this.me(principal);
  }
}
