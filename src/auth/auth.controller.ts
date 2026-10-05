import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { SkipThrottle, ThrottlerGuard } from '@nestjs/throttler';
import { RegisterUser } from '../user/dto/create-user.dto';
import { LoginDto } from '../user/dto/login.dto';
import { UpdateMe } from '../user/dto/update-me.dto';
import {
  Authenticated,
  CurrentUser,
  Principal,
  Public,
} from './access.decorators';
import { AuthService } from './auth.service';
import { LOGIN_THROTTLER, REGISTER_THROTTLER } from './rate-limits';

const validation = new ValidationPipe({ transform: true, whitelist: true });

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /**
   * Limited per IP (LOGIN_RATE_LIMIT, default 10 a minute), so passwords
   * cannot be guessed in bulk.
   */
  @Post('login')
  @Public()
  @UseGuards(ThrottlerGuard)
  @SkipThrottle({ [REGISTER_THROTTLER]: true })
  @HttpCode(HttpStatus.OK)
  login(@Body(validation) dto: LoginDto) {
    return this.auth.login(dto);
  }

  /**
   * Public sign-up page; the new account gets the VIEWER role. Limited per IP
   * (REGISTER_RATE_LIMIT, default 5 an hour).
   */
  @Post('register')
  @Public()
  @UseGuards(ThrottlerGuard)
  @SkipThrottle({ [LOGIN_THROTTLER]: true })
  register(@Body(validation) dto: RegisterUser) {
    return this.auth.register(dto);
  }

  /** Tokens are stateless: the client drops its token, nothing to revoke here. */
  @Post('logout')
  @Authenticated()
  @HttpCode(HttpStatus.OK)
  logout() {
    return { message: 'Đăng xuất thành công' };
  }

  /** Who is logged in and what they may do; the admin web builds its menu from it. */
  @Get('me')
  @Authenticated()
  me(@CurrentUser() principal: Principal) {
    return this.auth.me(principal);
  }

  /** Anyone logged in may edit their own name, email and password (not their role). */
  @Put('me')
  @Authenticated()
  updateMe(
    @CurrentUser() principal: Principal,
    @Body(validation) dto: UpdateMe,
  ) {
    return this.auth.updateMe(principal, dto);
  }
}
