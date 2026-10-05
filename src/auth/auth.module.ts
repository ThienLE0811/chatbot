import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { RolesModule } from '../roles/roles.module';
import { UsersModule } from '../user/users.module';
import { AccessGuard } from './access.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { rateLimitsFromConfig } from './rate-limits';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('SECRET_KEY');
        if (!secret) throw new Error('SECRET_KEY is required to sign logins');
        return {
          secret,
          signOptions: { expiresIn: config.get('JWT_EXPIRES_IN') ?? '8h' },
        };
      },
    }),
    // Only the login and sign-up routes are throttled (see AuthController).
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: rateLimitsFromConfig,
    }),
    UsersModule,
    RolesModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, { provide: APP_GUARD, useClass: AccessGuard }],
})
export class AuthModule {}
