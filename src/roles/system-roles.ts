import { ALL_PERMISSIONS, Permission, isPermission } from '../auth/permissions';

export const ADMIN_ROLE = 'ADMIN';
/** Role given to accounts created from the public sign-up page. */
export const SIGNUP_ROLE = 'VIEWER';

/** Created on startup when missing; cannot be deleted. */
export const SYSTEM_ROLES: {
  code: string;
  name: string;
  description: string;
  permissions: readonly Permission[];
}[] = [
  {
    code: ADMIN_ROLE,
    name: 'Quản trị viên',
    description: 'Toàn quyền, luôn có mọi quyền của hệ thống',
    permissions: ALL_PERMISSIONS,
  },
  {
    code: SIGNUP_ROLE,
    name: 'Người xem',
    description: 'Nhóm mặc định của tài khoản tự đăng ký',
    permissions: ['dialogue.read', 'train.read'],
  },
];

/**
 * What a role actually grants: ADMIN always has every permission, including
 * ones added to the catalog later; stored keys no longer in the catalog are
 * ignored.
 */
export function effectivePermissions(role: {
  code: string;
  permissions?: string[];
}): Permission[] {
  if (role.code === ADMIN_ROLE) return [...ALL_PERMISSIONS];
  return (role.permissions ?? []).filter(isPermission);
}
