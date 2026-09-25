import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Principal } from '../auth/access.decorators';
import { ALL_PERMISSIONS } from '../auth/permissions';
import { UsersService } from './users.service';

const ADMIN_ID = '64b000000000000000000001';
const EDITOR_ID = '64b000000000000000000002';

const roleDocs: Record<
  string,
  { code: string; name: string; permissions: string[] }
> = {
  ADMIN: { code: 'ADMIN', name: 'Quản trị viên', permissions: [] },
  EDITOR: {
    code: 'EDITOR',
    name: 'Biên tập',
    permissions: ['users.read', 'users.write'],
  },
  VIEWER: { code: 'VIEWER', name: 'Người xem', permissions: ['dialogue.read'] },
};

const lean = (value: unknown) => ({ lean: jest.fn().mockResolvedValue(value) });

describe('UsersService', () => {
  let model: Record<string, jest.Mock>;
  let roles: Record<string, jest.Mock>;
  let service: UsersService;
  let stored: Record<
    string,
    { _id: string; userName: string; roleCode: string }
  >;

  const admin: Principal = {
    id: ADMIN_ID,
    userName: 'admin',
    roleCode: 'ADMIN',
    permissions: [...ALL_PERMISSIONS],
  };
  const editor: Principal = {
    id: EDITOR_ID,
    userName: 'editor',
    roleCode: 'EDITOR',
    permissions: ['users.read', 'users.write'],
  };

  beforeEach(() => {
    stored = {
      [ADMIN_ID]: { _id: ADMIN_ID, userName: 'admin', roleCode: 'ADMIN' },
      [EDITOR_ID]: { _id: EDITOR_ID, userName: 'editor', roleCode: 'EDITOR' },
    };
    model = {
      findById: jest.fn((id) => lean(stored[id] ?? null)),
      findByIdAndUpdate: jest.fn((id, changes) =>
        lean({ ...stored[id], ...changes }),
      ),
      exists: jest.fn().mockResolvedValue(null),
      create: jest.fn(async (doc) => doc),
      deleteOne: jest.fn().mockResolvedValue({}),
      countDocuments: jest.fn().mockResolvedValue(1),
    };
    roles = {
      findByCode: jest.fn(async (code) => roleDocs[code] ?? null),
      permissionsOf: jest.fn(async (code) =>
        code === 'ADMIN'
          ? [...ALL_PERMISSIONS]
          : roleDocs[code]?.permissions ?? [],
      ),
      list: jest.fn().mockResolvedValue(Object.values(roleDocs)),
    };
    service = new UsersService(model as any, roles as any);
  });

  describe('create', () => {
    it('uses the role it is given, not one smuggled into the body', async () => {
      await service.create(
        {
          userName: 'mallory',
          password: 'secret1',
          email: 'm@x.io',
          roleCode: 'ADMIN',
        } as any,
        'VIEWER',
      );
      expect(model.create).toHaveBeenCalledWith(
        expect.objectContaining({ userName: 'mallory', roleCode: 'VIEWER' }),
      );
      expect(model.create.mock.calls[0][0].password).not.toBe('secret1');
    });

    it('refuses a taken user name', async () => {
      model.exists.mockResolvedValue({ _id: 'x' });
      await expect(
        service.create(
          { userName: 'admin', password: 'secret1', email: 'a@x.io' },
          'VIEWER',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('createByAdmin', () => {
    it('does not let an actor hand out a role above their own', async () => {
      await expect(
        service.createByAdmin(
          {
            userName: 'friend',
            password: 'secret1',
            email: 'f@x.io',
            roleCode: 'ADMIN',
          },
          editor,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(model.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('does not let an actor promote themselves', async () => {
      await expect(
        service.update(EDITOR_ID, { roleCode: 'ADMIN' }, editor),
      ).rejects.toThrow(ForbiddenException);
    });

    it('does not let an actor edit (or reset the password of) a stronger user', async () => {
      await expect(
        service.update(ADMIN_ID, { password: 'hijack1' }, editor),
      ).rejects.toThrow(ForbiddenException);
    });

    it('keeps the last admin an admin', async () => {
      await expect(
        service.update(ADMIN_ID, { roleCode: 'VIEWER' }, admin),
      ).rejects.toThrow(BadRequestException);
    });

    it('changes the role and hashes a new password', async () => {
      const result = await service.update(
        EDITOR_ID,
        { roleCode: 'VIEWER', password: 'newpass' },
        admin,
      );
      const changes = model.findByIdAndUpdate.mock.calls[0][1];
      expect(changes.roleCode).toBe('VIEWER');
      expect(changes.password).toMatch(/^\$2[aby]\$/);
      expect(result.statusCode).toBe(200);
    });
  });

  describe('delete', () => {
    it('refuses to delete your own account', async () => {
      await expect(service.delete(ADMIN_ID, admin)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('refuses to delete a stronger user', async () => {
      await expect(service.delete(ADMIN_ID, editor)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('updateOwn', () => {
    beforeEach(async () => {
      const password = await bcrypt.hash('oldpass', 4);
      model.findById.mockImplementation((id) => ({
        select: () => lean({ ...stored[id], password }),
      }));
    });

    it('changes the profile but never the role', async () => {
      await service.updateOwn(EDITOR_ID, {
        firstName: 'Thiện',
        roleCode: 'ADMIN',
      } as any);
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        EDITOR_ID,
        { firstName: 'Thiện' },
        { new: true },
      );
    });

    it('asks for the current password before changing it', async () => {
      await expect(
        service.updateOwn(EDITOR_ID, {
          newPassword: 'newpass',
          currentPassword: 'wrong',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(model.findByIdAndUpdate).not.toHaveBeenCalled();

      await service.updateOwn(EDITOR_ID, {
        newPassword: 'newpass',
        currentPassword: 'oldpass',
      });
      const { password } = model.findByIdAndUpdate.mock.calls[0][1];
      await expect(bcrypt.compare('newpass', password)).resolves.toBe(true);
    });
  });
});
