// Route handlers below only carry decorators.
/* eslint-disable @typescript-eslint/no-empty-function */
import { ForbiddenException, Sse, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  Authenticated,
  Principal,
  Public,
  ReadWriteAccess,
  RequireAnyPermission,
  RequirePermissions,
} from './access.decorators';
import { AccessGuard } from './access.guard';

@RequirePermissions('dialogue.read')
class Routes {
  @Public() open() {}
  @Authenticated() anyone() {}
  read() {}
  @RequirePermissions('dialogue.write') write() {}
  @RequireAnyPermission('roles.read', 'users.write') either() {}
  @Sse() stream() {}
}

const editor: Principal = {
  id: 'u1',
  userName: 'editor',
  roleCode: 'EDITOR',
  permissions: ['dialogue.read', 'users.write'],
};

describe('AccessGuard', () => {
  let jwt: { verifyAsync: jest.Mock };
  let auth: { principal: jest.Mock };
  let guard: AccessGuard;

  beforeEach(() => {
    jwt = { verifyAsync: jest.fn().mockResolvedValue({ sub: 'u1' }) };
    auth = { principal: jest.fn().mockResolvedValue(editor) };
    guard = new AccessGuard(new Reflector(), jwt as any, auth as any);
  });

  const call = (handler: keyof Routes, request: any = bearer('good')) =>
    guard.canActivate({
      getHandler: () => Routes.prototype[handler],
      getClass: () => Routes,
      switchToHttp: () => ({ getRequest: () => request }),
    } as any);

  function bearer(token: string) {
    return { headers: { authorization: `Bearer ${token}` }, query: {} };
  }

  it('lets public routes through without a token', async () => {
    await expect(call('open', { headers: {} })).resolves.toBe(true);
    expect(jwt.verifyAsync).not.toHaveBeenCalled();
  });

  it('asks for a login when the token is missing or invalid', async () => {
    await expect(call('anyone', { headers: {} })).rejects.toThrow(
      UnauthorizedException,
    );
    jwt.verifyAsync.mockRejectedValue(new Error('jwt expired'));
    await expect(call('anyone')).rejects.toThrow(UnauthorizedException);
  });

  it('rejects tokens of deleted accounts', async () => {
    auth.principal.mockResolvedValue(null);
    await expect(call('anyone')).rejects.toThrow(UnauthorizedException);
  });

  it('attaches the user and applies the controller permission', async () => {
    const request = bearer('good');
    await expect(call('read', request)).resolves.toBe(true);
    expect(request).toHaveProperty('user', editor);
  });

  it('lets a handler permission override the controller one', async () => {
    await expect(call('write')).rejects.toThrow(ForbiddenException);
  });

  it('accepts any one of the listed permissions when asked to', async () => {
    await expect(call('either')).resolves.toBe(true);
  });

  it('maps GET to .read and every other method to .write', async () => {
    @ReadWriteAccess('dialogue')
    class Dialogue {
      handle() {}
    }
    const as = (method: string) =>
      guard.canActivate({
        getHandler: () => Dialogue.prototype.handle,
        getClass: () => Dialogue,
        switchToHttp: () => ({
          getRequest: () => ({ ...bearer('good'), method }),
        }),
      } as any);

    await expect(as('GET')).resolves.toBe(true);
    await expect(as('DELETE')).rejects.toThrow(ForbiddenException);
    await expect(as('POST')).rejects.toThrow(ForbiddenException);
  });

  it('takes a query token on SSE routes only', async () => {
    const viaQuery = { headers: {}, query: { access_token: 'good' } };
    await expect(call('stream', viaQuery)).resolves.toBe(true);
    expect(jwt.verifyAsync).toHaveBeenCalledWith('good');
    await expect(call('read', viaQuery)).rejects.toThrow(UnauthorizedException);
  });
});
