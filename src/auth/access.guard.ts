import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SSE_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ACCESS_KEY, AccessRule } from './access.decorators';
import { AuthService } from './auth.service';

const AUTHENTICATED: AccessRule = { kind: 'authenticated' };

/**
 * Global guard: checks the JWT, loads the user's current permissions from
 * their role (so editing a role applies at once) and enforces the route's
 * AccessRule.
 */
@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rule =
      this.reflector.getAllAndOverride<AccessRule>(ACCESS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? AUTHENTICATED;
    if (rule.kind === 'public') return true;

    const request = context.switchToHttp().getRequest();
    const token = this.tokenOf(request, context);
    if (!token) throw new UnauthorizedException('Vui lòng đăng nhập');

    let userId: string;
    try {
      userId = (await this.jwt.verifyAsync<{ sub: string }>(token)).sub;
    } catch {
      throw new UnauthorizedException(
        'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại',
      );
    }
    const principal = await this.auth.principal(userId);
    if (!principal) {
      throw new UnauthorizedException('Tài khoản không còn tồn tại');
    }
    request.user = principal;

    if (!allows(rule, principal.permissions, request.method)) {
      throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này');
    }
    return true;
  }

  /**
   * `Authorization: Bearer <token>`. EventSource cannot send headers, so SSE
   * routes (and only those) also accept `?access_token=<token>`.
   */
  private tokenOf(request: any, context: ExecutionContext): string | undefined {
    const [scheme, value] = String(request.headers?.authorization ?? '').split(
      ' ',
    );
    if (scheme === 'Bearer' && value) return value;
    const isSse = this.reflector.get<boolean>(
      SSE_METADATA,
      context.getHandler(),
    );
    const query = request.query?.access_token;
    return isSse && typeof query === 'string' ? query : undefined;
  }
}

function allows(rule: AccessRule, granted: string[], method: string): boolean {
  const held = new Set(granted);
  switch (rule.kind) {
    case 'public':
    case 'authenticated':
      return true;
    case 'permissions':
      return rule.match === 'all'
        ? rule.permissions.every((p) => held.has(p))
        : rule.permissions.some((p) => held.has(p));
    case 'readWrite': {
      const reads = method === 'GET' || method === 'HEAD';
      return held.has(`${rule.module}.${reads ? 'read' : 'write'}`);
    }
  }
}
