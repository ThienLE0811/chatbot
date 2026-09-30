import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { Permission } from './permissions';

/** The logged-in user, attached to the request by AccessGuard. */
export interface Principal {
  id: string;
  userName: string;
  roleCode: string;
  permissions: Permission[];
}

type ReadWriteOf<P> = P extends `${infer M}.write`
  ? `${M}.read` extends Permission
    ? M
    : never
  : never;

/** Modules with both a `.read` and a `.write` permission. */
export type ReadWriteModule = ReadWriteOf<Permission>;

export type AccessRule =
  | { kind: 'public' }
  | { kind: 'authenticated' }
  | { kind: 'permissions'; permissions: Permission[]; match: 'all' | 'any' }
  | { kind: 'readWrite'; module: ReadWriteModule };

export const ACCESS_KEY = 'access';

/**
 * Every route declares one of these, on the handler or on its controller;
 * the handler's declaration wins. access-coverage.spec.ts enforces it.
 */
export const Public = () => SetMetadata(ACCESS_KEY, { kind: 'public' });

/** Any logged-in user, whatever their role. */
export const Authenticated = () =>
  SetMetadata(ACCESS_KEY, { kind: 'authenticated' });

/** The user's role must hold every listed permission. */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(ACCESS_KEY, { kind: 'permissions', permissions, match: 'all' });

/** The user's role must hold at least one of the listed permissions. */
export const RequireAnyPermission = (...permissions: Permission[]) =>
  SetMetadata(ACCESS_KEY, { kind: 'permissions', permissions, match: 'any' });

/**
 * `<module>.read` for GET and HEAD, `<module>.write` for every other method.
 * Fails closed: a read done with POST needs the write permission.
 */
export const ReadWriteAccess = (module: ReadWriteModule) =>
  SetMetadata(ACCESS_KEY, { kind: 'readWrite', module });

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Principal =>
    ctx.switchToHttp().getRequest().user,
);
