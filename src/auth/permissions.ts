/**
 * Every permission the API checks, grouped by module for the role editor.
 * Roles store a subset of these keys; the list lives in code because the
 * guards reference the keys directly.
 */
export const PERMISSION_MODULES = [
  {
    module: 'dialogue',
    label: 'Thiết kế hội thoại',
    description:
      'Ý định, thực thể, phản hồi, slots, NLU, rules, stories, forms, actions',
    permissions: [
      { key: 'dialogue.read', label: 'Xem' },
      { key: 'dialogue.write', label: 'Thêm, sửa, xóa' },
    ],
  },
  {
    module: 'train',
    label: 'Train model',
    description: 'Train, model đang chạy, lịch sử train',
    permissions: [
      { key: 'train.read', label: 'Xem job, model, lịch sử train' },
      { key: 'train.run', label: 'Train, kiểm tra dữ liệu, đổi model' },
    ],
  },
  {
    module: 'chat_test',
    label: 'Chat thử',
    description: 'Chat thử với bot trên web quản trị',
    permissions: [{ key: 'chat_test.use', label: 'Chat thử' }],
  },
  {
    module: 'conversations',
    label: 'Hội thoại thật',
    description: 'Hội thoại của người dùng thật (Telegram)',
    permissions: [
      { key: 'conversations.read', label: 'Xem' },
      {
        key: 'conversations.review',
        label: 'Đánh dấu, thêm tin nhắn vào ý định',
      },
    ],
  },
  {
    module: 'users',
    label: 'Người dùng',
    description: 'Tài khoản đăng nhập web quản trị',
    permissions: [
      { key: 'users.read', label: 'Xem' },
      { key: 'users.write', label: 'Thêm, sửa, xóa, đổi nhóm quyền' },
    ],
  },
  {
    module: 'roles',
    label: 'Phân quyền',
    description: 'Nhóm quyền và quyền của từng nhóm',
    permissions: [
      { key: 'roles.read', label: 'Xem' },
      { key: 'roles.write', label: 'Thêm, sửa, xóa' },
    ],
  },
] as const;

export type Permission =
  (typeof PERMISSION_MODULES)[number]['permissions'][number]['key'];

export const ALL_PERMISSIONS: readonly Permission[] =
  PERMISSION_MODULES.flatMap((group) =>
    group.permissions.map((permission) => permission.key),
  );

export function isPermission(value: string): value is Permission {
  return (ALL_PERMISSIONS as readonly string[]).includes(value);
}

/**
 * Adds what the listed permissions imply: any permission of a module includes
 * that module's first one (writing intents is useless without seeing them).
 */
export function withImplied(permissions: readonly Permission[]): Permission[] {
  const result = new Set(permissions);
  for (const group of PERMISSION_MODULES) {
    const keys: readonly Permission[] = group.permissions.map((p) => p.key);
    if (keys.some((key) => result.has(key))) result.add(keys[0]);
  }
  return ALL_PERMISSIONS.filter((key) => result.has(key));
}

/** True when `granted` holds every permission in `required`. */
export function covers(
  granted: readonly string[],
  required: readonly string[],
): boolean {
  const held = new Set(granted);
  return required.every((permission) => held.has(permission));
}
