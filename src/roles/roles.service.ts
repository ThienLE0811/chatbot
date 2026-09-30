import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { Principal } from '../auth/access.decorators';
import { covers, Permission, withImplied } from '../auth/permissions';
import { User, UserDocument } from '../user/schema/users.schema';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';
import { Role, RoleDocument } from './schema/role.schema';
import { ADMIN_ROLE, effectivePermissions, SYSTEM_ROLES } from './system-roles';

export type RoleView = Role & {
  _id: unknown;
  permissions: Permission[];
  userCount: number;
};

@Injectable()
export class RolesService implements OnModuleInit {
  constructor(
    @InjectModel(Role.name) private readonly roles: Model<RoleDocument>,
    @InjectModel(User.name) private readonly users: Model<UserDocument>,
  ) {}

  async onModuleInit() {
    await this.ensureSystemRoles();
  }

  /** Creates the built-in roles on a fresh database; keeps admins' edits. */
  async ensureSystemRoles(): Promise<void> {
    for (const { code, name, description, permissions } of SYSTEM_ROLES) {
      await this.roles.updateOne(
        { code },
        {
          $setOnInsert: { name, description, permissions },
          $set: { isSystem: true },
        },
        { upsert: true },
      );
    }
  }

  async list(): Promise<RoleView[]> {
    const [roles, counts] = await Promise.all([
      this.roles
        .find({ code: { $exists: true } })
        .sort({ createdAt: 1 })
        .lean(),
      this.users.aggregate<{ _id: string; count: number }>([
        { $group: { _id: '$roleCode', count: { $sum: 1 } } },
      ]),
    ]);
    const userCount = new Map(counts.map((c) => [c._id, c.count]));
    return roles.map((role) => ({
      ...role,
      permissions: effectivePermissions(role),
      userCount: userCount.get(role.code) ?? 0,
    }));
  }

  async findOne(id: string): Promise<RoleView> {
    const role = await this.require(id);
    const userCount = await this.users.countDocuments({ roleCode: role.code });
    return { ...role, permissions: effectivePermissions(role), userCount };
  }

  async findByCode(code: string) {
    return this.roles.findOne({ code }).lean();
  }

  /** Permissions granted by a role; none when the role no longer exists. */
  async permissionsOf(code: string): Promise<Permission[]> {
    const role = code ? await this.findByCode(code) : null;
    return role ? effectivePermissions(role) : [];
  }

  async create(dto: CreateRoleDto, actor: Principal) {
    const permissions = withImplied(dto.permissions);
    assertWithinOwn(actor, permissions);
    if (await this.roles.exists({ code: dto.code })) {
      throw new ConflictException(`Mã nhóm ${dto.code} đã tồn tại`);
    }
    return this.roles.create({ ...dto, permissions, isSystem: false });
  }

  async update(id: string, dto: UpdateRoleDto, actor: Principal) {
    const role = await this.require(id);
    // ADMIN luôn có mọi quyền: chỉ sửa được tên và mô tả.
    const permissions =
      role.code === ADMIN_ROLE
        ? role.permissions
        : withImplied(dto.permissions);
    assertWithinOwn(actor, effectivePermissions(role));
    assertWithinOwn(actor, permissions);
    return this.roles
      .findByIdAndUpdate(
        id,
        { name: dto.name, description: dto.description, permissions },
        { new: true },
      )
      .lean();
  }

  async delete(id: string, actor: Principal) {
    const role = await this.require(id);
    if (role.isSystem) {
      throw new BadRequestException(
        `Không xóa được nhóm hệ thống ${role.code}`,
      );
    }
    assertWithinOwn(actor, effectivePermissions(role));
    const members = await this.users.countDocuments({ roleCode: role.code });
    if (members > 0) {
      throw new ConflictException(
        `Còn ${members} người dùng thuộc nhóm ${role.code}, hãy chuyển họ sang nhóm khác trước`,
      );
    }
    await this.roles.deleteOne({ _id: role._id });
    return role;
  }

  private async require(id: string) {
    const role = isValidObjectId(id)
      ? await this.roles.findById(id).lean()
      : null;
    if (!role?.code) throw new NotFoundException('Không tìm thấy nhóm quyền');
    return role;
  }
}

/**
 * Nobody can hand out or take away permissions they do not hold themselves;
 * otherwise anyone with roles.write could make their own role an admin.
 */
function assertWithinOwn(actor: Principal, permissions: readonly string[]) {
  if (!covers(actor.permissions, permissions)) {
    throw new ForbiddenException(
      'Bạn chỉ được thao tác với nhóm quyền nằm trong quyền của chính mình',
    );
  }
}
