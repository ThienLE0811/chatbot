import { Permission } from '../auth/permissions';

/**
 * The old roles stored `roleAction: { KEY: true }` with one key per admin web
 * menu. Each key maps to the permissions that menu's pages now need.
 */
export const LEGACY_PERMISSIONS: Record<string, Permission[]> = {
  DIALOGUE_MANAGEMENT: ['dialogue.read', 'dialogue.write'],
  // Menu Train cũ gồm cả Chat thử và Hội thoại thật.
  TRAIN_MANAGEMENT: [
    'train.read',
    'train.run',
    'chat_test.use',
    'conversations.read',
    'conversations.review',
  ],
  // Menu Quản lý người dùng cũ gồm cả trang Phân quyền (chỉ xem).
  USER_MANAGEMENT: ['users.read', 'users.write', 'roles.read'],
  PERMISSION_MANAGEMENT: ['roles.read', 'roles.write'],
  // Menu đã bị ẩn trong web quản trị, không còn trang nào dùng.
  COMPONENT_MANAGEMENT: [],
};

/** Permissions of an old `roleAction` object, plus the keys it did not know. */
export function fromLegacyRoleAction(roleAction: unknown): {
  permissions: Permission[];
  unknown: string[];
} {
  const permissions = new Set<Permission>();
  const unknown: string[] = [];
  if (roleAction && typeof roleAction === 'object') {
    for (const [key, granted] of Object.entries(roleAction)) {
      if (!granted) continue;
      const mapped = LEGACY_PERMISSIONS[key];
      if (mapped) mapped.forEach((p) => permissions.add(p));
      else unknown.push(key);
    }
  }
  return { permissions: [...permissions], unknown };
}

/** Old role types were free text; codes are upper-case words. */
export function toRoleCode(roleType: unknown): string | undefined {
  if (typeof roleType !== 'string') return undefined;
  const code = roleType
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'D')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return code || undefined;
}
