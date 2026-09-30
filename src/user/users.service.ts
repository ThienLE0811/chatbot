import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { isValidObjectId, Model } from 'mongoose';
import { Principal } from '../auth/access.decorators';
import { covers } from '../auth/permissions';
import { RolesService } from '../roles/roles.service';
import { ADMIN_ROLE, effectivePermissions } from '../roles/system-roles';
import { CreateUser, RegisterUser } from './dto/create-user.dto';
import { UpdateMe } from './dto/update-me.dto';
import { UpdateUser } from './dto/update-user.dto';
import { User, UserDocument } from './schema/users.schema';

const SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly model: Model<UserDocument>,
    private readonly roles: RolesService,
  ) {}

  async findAll() {
    const [users, names] = await Promise.all([
      this.model.find().sort({ createdAt: -1 }).lean(),
      this.roleNames(),
    ]);
    return users.map((user) => withRoleName(user, names));
  }

  async findOne(id: string) {
    const [user, names] = await Promise.all([
      this.require(id),
      this.roleNames(),
    ]);
    return withRoleName(user, names);
  }

  /** Without the password; null when the account no longer exists. */
  async findById(id: string) {
    return isValidObjectId(id) ? this.model.findById(id).lean() : null;
  }

  async findForLogin(userName: string) {
    return this.model.findOne({ userName }).select('+password').lean();
  }

  /** Sign-up and admin creation both end here, with the role already chosen. */
  async create(
    dto: RegisterUser,
    roleCode: string,
  ): Promise<{ message: string; statusCode: number; User: User }> {
    if (!(await this.roles.findByCode(roleCode))) {
      throw new BadRequestException(`Nhóm quyền ${roleCode} không tồn tại`);
    }
    if (await this.model.exists({ userName: dto.userName })) {
      throw new ConflictException('Tên người dùng đã tồn tại!');
    }
    const user = await this.model.create({
      ...dto,
      roleCode,
      password: await bcrypt.hash(dto.password, SALT_ROUNDS),
    });
    return {
      statusCode: HttpStatus.OK,
      message: 'Tạo mới thành công',
      User: user,
    };
  }

  async createByAdmin(dto: CreateUser, actor: Principal) {
    await this.assertAssignable(actor, dto.roleCode);
    return this.create(dto, dto.roleCode);
  }

  async update(
    id: string,
    dto: UpdateUser,
    actor: Principal,
  ): Promise<{ message: string; statusCode: number; User: User }> {
    const user = await this.require(id);
    await this.assertManageable(actor, user);

    const { password, roleCode, ...profile } = dto;
    const changes: Partial<User> = { ...profile };
    // Admin đặt lại mật khẩu: có gửi thì hash rồi lưu, bỏ trống thì giữ mật khẩu cũ.
    if (password) changes.password = await bcrypt.hash(password, SALT_ROUNDS);
    if (roleCode && roleCode !== user.roleCode) {
      await this.assertAssignable(actor, roleCode);
      await this.assertNotLastAdmin(user);
      changes.roleCode = roleCode;
    }

    const updated = await this.model
      .findByIdAndUpdate(id, changes, { new: true })
      .lean();
    return {
      message: 'Cập nhật thành công',
      statusCode: HttpStatus.OK,
      User: updated,
    };
  }

  /**
   * Người dùng tự sửa tài khoản của mình, không cần quyền users.*. Chỉ nhận họ
   * tên, email, mật khẩu; nhóm quyền không bao giờ đổi ở đây.
   */
  async updateOwn(id: string, dto: UpdateMe) {
    const user = await this.model.findById(id).select('+password').lean();
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    const { firstName, lastName, email, newPassword, currentPassword } = dto;
    const changes: Partial<User> = { firstName, lastName, email };
    if (newPassword) {
      const matches = await bcrypt.compare(
        currentPassword ?? '',
        user.password,
      );
      if (!matches) {
        throw new BadRequestException('Mật khẩu hiện tại không đúng');
      }
      changes.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
    }
    // Bỏ các trường không gửi lên, để không ghi đè thành rỗng.
    Object.keys(changes).forEach(
      (key) => changes[key] === undefined && delete changes[key],
    );

    return this.model.findByIdAndUpdate(id, changes, { new: true }).lean();
  }

  async delete(
    id: string,
    actor: Principal,
  ): Promise<{ message: string; statusCode: number; user: User }> {
    if (id === actor.id) {
      throw new BadRequestException('Không thể tự xóa tài khoản của mình');
    }
    const user = await this.require(id);
    await this.assertManageable(actor, user);
    await this.assertNotLastAdmin(user);
    await this.model.deleteOne({ _id: user._id });
    return {
      message: `Xóa thành công người dùng ${user.userName}`,
      statusCode: HttpStatus.OK,
      user,
    };
  }

  private async require(id: string) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    return user;
  }

  private async roleNames(): Promise<Map<string, string>> {
    const roles = await this.roles.list();
    return new Map(roles.map((role) => [role.code, role.name]));
  }

  /**
   * Editing someone includes resetting their password, i.e. being able to log
   * in as them, so their role must not grant more than the actor holds.
   */
  private async assertManageable(
    actor: Principal,
    user: { _id: unknown; roleCode: string },
  ) {
    if (String(user._id) === actor.id) return;
    const theirs = await this.roles.permissionsOf(user.roleCode);
    if (!covers(actor.permissions, theirs)) {
      throw new ForbiddenException(
        'Không thể thao tác với người dùng có nhiều quyền hơn bạn',
      );
    }
  }

  /** Otherwise anyone with users.write could make themselves an admin. */
  private async assertAssignable(actor: Principal, roleCode: string) {
    const role = await this.roles.findByCode(roleCode);
    if (!role) {
      throw new BadRequestException(`Nhóm quyền ${roleCode} không tồn tại`);
    }
    if (!covers(actor.permissions, effectivePermissions(role))) {
      throw new ForbiddenException(
        'Không thể gán nhóm quyền có nhiều quyền hơn bạn',
      );
    }
  }

  private async assertNotLastAdmin(user: { roleCode: string }) {
    if (user.roleCode !== ADMIN_ROLE) return;
    const admins = await this.model.countDocuments({ roleCode: ADMIN_ROLE });
    if (admins <= 1) {
      throw new BadRequestException(
        'Đây là quản trị viên cuối cùng, không thể xóa hoặc chuyển sang nhóm khác',
      );
    }
  }
}

function withRoleName<T extends { roleCode: string }>(
  user: T,
  names: Map<string, string>,
) {
  return { ...user, roleName: names.get(user.roleCode) ?? user.roleCode };
}
