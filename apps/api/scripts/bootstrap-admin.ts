import 'dotenv/config';
import { Prisma, PrismaClient, UserRole } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { hostname, userInfo } from 'node:os';

const db = new PrismaClient();
const userSelect = {
  id: true,
  email: true,
  role: true,
  isActive: true,
  emailVerifiedAt: true,
} as const;
class BootstrapError extends Error {}
function options() {
  const args = process.argv.slice(2);
  const values = new Map<string, string>();
  const flags = new Set<string>();
  for (let index = 0; index < args.length; index++) {
    const key = args[index];
    if (['--dry-run', '--apply', '--approved'].includes(key)) {
      if (flags.has(key)) throw new BootstrapError(`Cờ bị lặp: ${key}`);
      flags.add(key);
    } else if (['--email', '--user-id', '--expected-role'].includes(key)) {
      const value = args[++index];
      if (!value || value.startsWith('--') || values.has(key))
        throw new BootstrapError(`Tham số không hợp lệ: ${key}`);
      values.set(key, value);
    } else
      throw new BootstrapError(
        'Tham số không được hỗ trợ. Không truyền mật khẩu/token vào CLI.',
      );
  }
  const email = values.get('--email')?.trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    throw new BootstrapError(
      'Cần --email chính xác của tài khoản đã được chỉ định.',
    );
  if (flags.has('--apply') && flags.has('--dry-run'))
    throw new BootstrapError('Chỉ chọn --dry-run hoặc --apply.');
  const apply = flags.has('--apply');
  const expectedId = values.get('--user-id');
  const expectedRole = values.get('--expected-role');
  if (
    apply &&
    (!flags.has('--approved') ||
      !expectedId ||
      !expectedRole ||
      !Object.values(UserRole).includes(expectedRole as UserRole))
  ) {
    throw new BootstrapError(
      'Apply cần --approved, --user-id và --expected-role lấy từ dry-run.',
    );
  }
  const environment = process.env.NODE_ENV || 'development';
  if (!['development', 'demo', 'test'].includes(environment))
    throw new BootstrapError(
      'Bootstrap chỉ cho development/demo/test; môi trường này bị từ chối.',
    );
  return { email, apply, expectedId, expectedRole, environment };
}
const quote = (value: string) => `'${value.replace(/'/g, "''")}'`;
async function main() {
  const input = options();
  const result = await db.$transaction(
    async (tx) => {
      if (!input.apply) await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      else await tx.$executeRaw`SELECT pg_advisory_xact_lock(71301142)`;
      const before = await tx.user.findUnique({
        where: { email: input.email },
        select: userSelect,
      });
      const admins = await tx.user.findMany({
        where: { role: 'ADMIN' },
        select: userSelect,
        orderBy: { id: 'asc' },
      });
      const reasons: string[] = [];
      if (!before)
        reasons.push('Tài khoản đích chưa tồn tại. Không tạo tài khoản mới.');
      else {
        if (before.email !== input.email)
          reasons.push('Email lưu trong database không khớp chính xác.');
        if (!before.isActive) reasons.push('Tài khoản đích đã bị vô hiệu hóa.');
        if (!before.emailVerifiedAt)
          reasons.push('Email chưa được xác minh OTP.');
        if (
          before.role !== 'ADMIN' &&
          admins.some((admin) => admin.id !== before.id)
        )
          reasons.push(
            'Đã có ADMIN khác; cần quy trình quản trị riêng, không bootstrap thêm.',
          );
        if (input.apply && before.id !== input.expectedId)
          reasons.push('User ID đã khác kết quả dry-run.');
        if (
          input.apply &&
          before.role !== 'ADMIN' &&
          before.role !== input.expectedRole
        )
          reasons.push('Role đã khác kết quả dry-run.');
      }
      const plan = {
        mode: input.apply ? 'APPLY' : 'DRY_RUN',
        environment: input.environment,
        eligible: !reasons.length,
        decision: reasons.length
          ? 'BLOCKED'
          : before?.role === 'ADMIN'
            ? 'NOOP_ALREADY_ADMIN'
            : 'READY_TO_PROMOTE',
        before,
        existingAdmins: admins,
        reasons,
        changed: false,
        intendedChange:
          before && before.role !== 'ADMIN'
            ? {
                userId: before.id,
                field: 'role',
                from: before.role,
                to: 'ADMIN',
              }
            : null,
        applyCommand:
          !reasons.length && before && before.role !== 'ADMIN'
            ? `npm.cmd run admin:bootstrap -- --apply --approved --email ${quote(before.email)} --user-id ${quote(before.id)} --expected-role ${quote(before.role)}`
            : null,
      };
      if (!input.apply || reasons.length || before?.role === 'ADMIN')
        return plan;
      if (!before?.emailVerifiedAt)
        throw new BootstrapError('Không đủ điều kiện apply.');
      const updated = await tx.user.updateMany({
        where: {
          id: before.id,
          email: input.email,
          role: before.role,
          isActive: true,
          emailVerifiedAt: before.emailVerifiedAt,
        },
        data: { role: 'ADMIN' },
      });
      if (updated.count !== 1)
        throw new BootstrapError(
          'Trạng thái tài khoản đã đổi; transaction bị hủy. Chạy lại dry-run.',
        );
      const after = await tx.user.findUniqueOrThrow({
        where: { id: before.id },
        select: userSelect,
      });
      if (
        after.role !== 'ADMIN' ||
        after.email !== input.email ||
        !after.isActive ||
        !after.emailVerifiedAt
      )
        throw new BootstrapError(
          'Kiểm tra sau cập nhật không đạt; transaction bị hủy.',
        );
      const receipt = await tx.idempotencyRecord.create({
        data: {
          actorId: before.id,
          operation: 'bootstrap.admin.approved',
          key: randomUUID(),
          requestHash: before.id,
          result: {
            targetUserId: before.id,
            fromRole: before.role,
            toRole: 'ADMIN',
            approvedByOperator: true,
            source: 'manual-cli',
            localOperator: userInfo().username,
            host: hostname(),
            verifiedAtObserved: before.emailVerifiedAt.toISOString(),
            executedAt: new Date().toISOString(),
          },
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
        select: { id: true, operation: true, createdAt: true },
      });
      return {
        ...plan,
        changed: true,
        decision: 'PROMOTED',
        after,
        receipt,
        applyCommand: null,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
  console.log(JSON.stringify(result, null, 2));
  if (!result.eligible) process.exitCode = 2;
  if (result.changed && result.before) {
    const persisted = await db.user.findUniqueOrThrow({
      where: { id: result.before.id },
      select: userSelect,
    });
    console.log(JSON.stringify({ persistedAfterCommit: persisted }, null, 2));
    if (
      persisted.role !== 'ADMIN' ||
      persisted.email !== input.email ||
      !persisted.isActive ||
      !persisted.emailVerifiedAt
    )
      throw new BootstrapError(
        'Cần kiểm tra lại role sau commit; không tự ghi lại.',
      );
  }
}
main()
  .catch((error: unknown) => {
    console.error(
      error instanceof BootstrapError
        ? error.message
        : 'Bootstrap không hoàn tất xác nhận. Kiểm tra trạng thái database và chạy lại dry-run trước khi thử apply; không in secret hoặc lỗi kết nối chi tiết.',
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
