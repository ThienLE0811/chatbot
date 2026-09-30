import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Principal } from '../auth/access.decorators';
import { ALL_PERMISSIONS } from '../auth/permissions';
import { RolesService } from './roles.service';

const ROLE_ID = '64b0000000000000000000aa';

const lean = (value: unknown) => ({ lean: jest.fn().mockResolvedValue(value) });

describe('RolesService', () => {
  let roles: Record<string, jest.Mock>;
  let users: Record<string, jest.Mock>;
  let service: RolesService;
  let stored: any;

  const admin: Principal = {
    id: 'a',
    userName: 'admin',
    roleCode: 'ADMIN',
    permissions: [...ALL_PERMISSIONS],
  };
  const lead: Principal = {
    id: 'l',
    userName: 'lead',
    roleCode: 'LEAD',
    permissions: ['roles.read', 'roles.write', 'dialogue.read'],
  };

  beforeEach(() => {
    stored = {
      _id: ROLE_ID,
      code: 'EDITOR',
      name: 'Biên tập',
      permissions: ['dialogue.read'],
      isSystem: false,
    };
    roles = {
      findById: jest.fn(() => lean(stored)),
      findByIdAndUpdate: jest.fn((_id, changes) =>
        lean({ ...stored, ...changes }),
      ),
      exists: jest.fn().mockResolvedValue(null),
      create: jest.fn(async (doc) => doc),
      deleteOne: jest.fn().mockResolvedValue({}),
      updateOne: jest.fn().mockResolvedValue({}),
    };
    users = {
      countDocuments: jest.fn().mockResolvedValue(0),
      aggregate: jest.fn(),
    };
    service = new RolesService(roles as any, users as any);
  });

  it('creates the built-in roles without overwriting edited ones', async () => {
    await service.ensureSystemRoles();
    expect(roles.updateOne).toHaveBeenCalledWith(
      { code: 'VIEWER' },
      expect.objectContaining({ $setOnInsert: expect.any(Object) }),
      { upsert: true },
    );
  });

  describe('create', () => {
    it('refuses permissions the actor does not hold', async () => {
      await expect(
        service.create(
          { code: 'BOSS', name: 'Boss', permissions: ['users.write'] },
          lead,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('refuses a taken code', async () => {
      roles.exists.mockResolvedValue({ _id: 'x' });
      await expect(
        service.create(
          { code: 'EDITOR', name: 'Again', permissions: [] },
          admin,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('never changes what ADMIN grants', async () => {
      stored = { ...stored, code: 'ADMIN', permissions: [], isSystem: true };
      await service.update(
        ROLE_ID,
        { name: 'Admin', permissions: ['dialogue.read'] },
        admin,
      );
      expect(roles.findByIdAndUpdate.mock.calls[0][1].permissions).toEqual([]);
    });

    it('does not let an actor edit a role stronger than their own', async () => {
      stored = { ...stored, permissions: ['users.write'] };
      await expect(
        service.update(ROLE_ID, { name: 'x', permissions: [] }, lead),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('delete', () => {
    it('keeps system roles', async () => {
      stored = { ...stored, code: 'VIEWER', isSystem: true };
      await expect(service.delete(ROLE_ID, admin)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('keeps roles that still have users', async () => {
      users.countDocuments.mockResolvedValue(3);
      await expect(service.delete(ROLE_ID, admin)).rejects.toThrow(
        ConflictException,
      );
      expect(roles.deleteOne).not.toHaveBeenCalled();
    });
  });
});
