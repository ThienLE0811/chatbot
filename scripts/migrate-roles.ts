/**
 * One-off migration to the role model of src/auth/permissions.ts.
 *
 * Roles used to store `roleType` (the code) and `roleAction` ({ MENU: true });
 * users kept `userRoleName` plus a copy of their role's `roleAction`, which
 * went stale whenever the role changed. Now a role has a `code` and a list of
 * `permissions`, and a user only has a `roleCode`.
 *
 *   npm run migrate:roles                          # apply
 *   npm run migrate:roles -- --dry-run             # only print what would change
 *   npm run migrate:roles -- --admin=<userName>    # also make that user an ADMIN
 *
 * Run it before starting the new backend. Running it again is harmless.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { covers } from '../src/auth/permissions';
import { fromLegacyRoleAction, toRoleCode } from '../src/roles/legacy-roles';
import {
  ADMIN_ROLE,
  effectivePermissions,
  SIGNUP_ROLE,
  SYSTEM_ROLES,
} from '../src/roles/system-roles';

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const admin = process.argv
    .find((arg) => arg.startsWith('--admin='))
    ?.slice('--admin='.length);
  const verb = dryRun ? 'sẽ' : 'đã';
  const db = mongoose.connection.db;
  const roles = db.collection('roles');
  const users = db.collection('users');
  const now = new Date();

  // 1. Roles: roleType → code, roleAction → permissions.
  const codeOf = new Map<string, string>();
  // Quyền mới của từng nhóm vừa chuyển, để bước 3 kiểm tra được cả khi --dry-run.
  const converted = new Map<string, string[]>();
  for (const role of await roles.find({ code: { $exists: false } }).toArray()) {
    const code = toRoleCode(role.roleType) ?? toRoleCode(role.name);
    if (!code) {
      console.warn(`⚠ bỏ qua nhóm ${role._id}: không có roleType lẫn name`);
      continue;
    }
    codeOf.set(role.roleType, code);
    const { permissions, unknown } = fromLegacyRoleAction(role.roleAction);
    if (unknown.length) {
      console.warn(
        `⚠ ${code}: bỏ qua quyền cũ không rõ nghĩa ${unknown.join(', ')}`,
      );
    }

    const existing = await roles.findOne({ code });
    if (existing) {
      // Backend mới đã tự tạo nhóm hệ thống cùng mã: gộp quyền vào đó, bỏ bản cũ.
      const merged = [
        ...new Set([...(existing.permissions ?? []), ...permissions]),
      ];
      converted.set(code, merged);
      console.log(
        `${code}: ${verb} gộp vào nhóm cùng mã đã có, quyền: ${
          merged.join(', ') || '(không có)'
        }`,
      );
      if (!dryRun) {
        await roles.updateOne(
          { _id: existing._id },
          { $set: { permissions: merged, updateAt: now } },
        );
        await roles.deleteOne({ _id: role._id });
      }
      continue;
    }

    converted.set(code, permissions);
    console.log(
      `${code}: ${verb} chuyển, quyền: ${
        permissions.join(', ') || '(không có)'
      }`,
    );
    if (!dryRun) {
      await roles.updateOne(
        { _id: role._id },
        {
          $set: {
            code,
            name: role.name || code,
            permissions,
            isSystem: SYSTEM_ROLES.some((r) => r.code === code),
            updateAt: now,
          },
          $unset: { roleType: '', roleAction: '', actionName: '' },
        },
      );
    }
  }

  // 2. Built-in roles, in case neither the old data nor the backend made them.
  for (const { code, name, description, permissions } of SYSTEM_ROLES) {
    if (converted.has(code) || (await roles.findOne({ code }))) continue;
    console.log(`${code}: ${verb} tạo nhóm hệ thống`);
    if (!dryRun) {
      await roles.insertOne({
        code,
        name,
        description,
        permissions: [...permissions],
        isSystem: true,
        createdAt: now,
        updateAt: now,
      });
    }
  }

  // 3. Users: userRoleName → roleCode, drop the stale copies.
  const allRoles = await roles.find({ code: { $exists: true } }).toArray();
  const knownCodes = new Set([
    ...allRoles.map((r) => r.code),
    ...converted.keys(),
  ]);
  const permissionsOf = (code: string) => {
    const role = allRoles.find((r) => r.code === code);
    const permissions = converted.get(code) ?? role?.permissions ?? [];
    return effectivePermissions({ code, permissions });
  };

  for (const user of await users
    .find({ roleCode: { $exists: false } })
    .toArray()) {
    const legacy = user.userRoleName;
    let code = codeOf.get(legacy) ?? toRoleCode(legacy);
    if (!code || !knownCodes.has(code)) {
      console.warn(
        `⚠ ${user.userName}: nhóm "${
          legacy ?? ''
        }" không tồn tại, ${verb} xếp vào ${SIGNUP_ROLE}`,
      );
      code = SIGNUP_ROLE;
    }
    // Lỗi cũ: đăng ký với userRoleName tùy ý thì nhận quyền của nhóm đó
    // dù bị ghi là USER. Báo ra để kiểm tra, không tự cấp thêm quyền.
    const copied = fromLegacyRoleAction(user.userRole).permissions;
    if (!covers(permissionsOf(code), copied)) {
      console.warn(
        `⚠ ${user.userName}: bản chép quyền cũ nhiều hơn nhóm ${code}, ` +
          'kiểm tra lại tài khoản này (có thể do lỗi đăng ký cũ)',
      );
    }
    console.log(`${user.userName}: ${verb} gán nhóm ${code}`);
    if (!dryRun) {
      await users.updateOne(
        { _id: user._id },
        {
          $set: { roleCode: code },
          $unset: { userRoleName: '', userRole: '', userGroup: '' },
        },
      );
    }
  }

  // 4. Optional: promote one account to ADMIN.
  if (admin) {
    const found = await users.findOne({ userName: admin });
    if (!found) console.warn(`⚠ không có người dùng ${admin}`);
    else {
      console.log(`${admin}: ${verb} chuyển sang nhóm ${ADMIN_ROLE}`);
      if (!dryRun) {
        await users.updateOne(
          { _id: found._id },
          { $set: { roleCode: ADMIN_ROLE } },
        );
      }
    }
  }

  if (!dryRun && !(await users.findOne({ roleCode: ADMIN_ROLE }))) {
    console.warn(
      `⚠ chưa có ai thuộc nhóm ${ADMIN_ROLE}: chạy lại với --admin=<userName> để có người quản trị`,
    );
  }
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    await main();
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
