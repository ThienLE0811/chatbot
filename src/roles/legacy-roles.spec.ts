import { fromLegacyRoleAction, toRoleCode } from './legacy-roles';

describe('fromLegacyRoleAction', () => {
  it('maps every granted menu key to its permissions, once each', () => {
    expect(
      fromLegacyRoleAction({
        USER_MANAGEMENT: true,
        PERMISSION_MANAGEMENT: true,
        DIALOGUE_MANAGEMENT: false,
      }),
    ).toEqual({
      permissions: ['users.read', 'users.write', 'roles.read', 'roles.write'],
      unknown: [],
    });
  });

  it('reports keys it does not know instead of guessing', () => {
    expect(
      fromLegacyRoleAction({
        TRAIN_MANAGEMENT: true,
        'USER_MANAGEMENT.CREATE_USER': true,
      }),
    ).toEqual({
      permissions: [
        'train.read',
        'train.run',
        'chat_test.use',
        'conversations.read',
        'conversations.review',
      ],
      unknown: ['USER_MANAGEMENT.CREATE_USER'],
    });
  });

  it('grants nothing for a missing or malformed roleAction', () => {
    expect(fromLegacyRoleAction(undefined)).toEqual({
      permissions: [],
      unknown: [],
    });
    expect(fromLegacyRoleAction('ADMIN')).toEqual({
      permissions: [],
      unknown: [],
    });
  });
});

describe('toRoleCode', () => {
  it('turns free-text role types into upper-case codes', () => {
    expect(toRoleCode('ADMIN')).toBe('ADMIN');
    expect(toRoleCode(' user ')).toBe('USER');
    expect(toRoleCode('Biên tập viên')).toBe('BIEN_TAP_VIEN');
  });

  it('gives up on empty values', () => {
    expect(toRoleCode('  ')).toBeUndefined();
    expect(toRoleCode(undefined)).toBeUndefined();
  });
});
