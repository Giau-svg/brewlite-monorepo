import { validPassword } from './password-policy';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { createHash, randomBytes, randomUUID, randomInt } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';
import { jwtSecret, SESSION_SECONDS, REFRESH_SECONDS } from './auth.config';
import type { RegisterDto, LoginDto, VerifyEmailDto } from './auth.dto';

export const publicUserSelect = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  emailVerifiedAt: true,
  loyaltyPoints: true,
} as const;
export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  emailVerifiedAt: Date | null;
  loyaltyPoints: number;
};
export type Principal = { user: AuthUser; sessionId: string };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    if (!dto.fullName.trim() || !validPassword(dto.password))
      throw new BadRequestException(
        'Mật khẩu tối thiểu 15 ký tự Unicode, tối đa 72 byte UTF-8; họ tên không được để trống.',
      );
    const passwordHash = await bcrypt.hash(dto.password, 12);
    let user;
    try {
      user = await this.prisma.user.create({
        data: {
          email: dto.email,
          fullName: dto.fullName.trim(),
          passwordHash,
          role: UserRole.CUSTOMER,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException(
          'Email đã được đăng ký. Hãy đăng nhập hoặc gửi lại mã xác minh.',
        );
      throw error;
    }
    await this.resend(user.email);
    return {
      message: 'Đã gửi mã OTP. Vui lòng xác minh email trước khi đăng nhập.',
    };
  }

  async resend(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { emailVerification: true },
    });
    const response = {
      message:
        'Nếu email cần xác minh, mã OTP sẽ được gửi. Mỗi lần gửi cách nhau ít nhất 60 giây.',
    };
    if (!user || user.emailVerifiedAt || !user.isActive) return response;
    const now = new Date();
    if (
      user.emailVerification &&
      now.getTime() - user.emailVerification.sentAt.getTime() < 60000
    )
      return response;
    const quota = await this.prisma.$transaction(
      async (tx) => {
        const count = await tx.idempotencyRecord.count({
          where: {
            actorId: user.id,
            operation: 'auth.otp.sent',
            createdAt: { gt: new Date(Date.now() - 900000) },
          },
        });
        if (count >= 3) return false;
        await tx.idempotencyRecord.create({
          data: {
            actorId: user.id,
            operation: 'auth.otp.sent',
            key: randomUUID(),
            requestHash: user.id,
            result: {},
            expiresAt: new Date(Date.now() + 86400000),
          },
        });
        return true;
      },
      { isolationLevel: 'Serializable' },
    );
    if (!quota)
      throw new BadRequestException('Tối đa 3 lần gửi OTP trong 15 phút.');
    const code = String(randomInt(100000, 1000000));
    const data = {
      codeHash: await bcrypt.hash(code, 12),
      expiresAt: new Date(now.getTime() + 300000),
      sentAt: now,
      attempts: 0,
    };
    // The unique userId serializes a first request; conditional updates prevent concurrent resends.
    let claimed = false;
    if (user.emailVerification) {
      claimed =
        (
          await this.prisma.emailVerification.updateMany({
            where: {
              userId: user.id,
              sentAt: { lte: new Date(now.getTime() - 60000) },
            },
            data,
          })
        ).count === 1;
    } else {
      try {
        await this.prisma.emailVerification.create({
          data: { ...data, userId: user.id },
        });
        claimed = true;
      } catch (error) {
        if (!(
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ))
          throw error;
      }
    }
    if (claimed) {
      try {
        await this.email.sendVerification(email, code);
      } catch (error) {
        await this.prisma.emailVerification.deleteMany({
          where: { userId: user.id, codeHash: data.codeHash },
        });
        throw error;
      }
    }
    return response;
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { emailVerification: true },
    });
    const verification = user?.emailVerification;
    const invalid = () =>
      new BadRequestException('Mã OTP không hợp lệ, đã hết hạn hoặc đã dùng.');
    if (!user || !user.isActive || user.emailVerifiedAt || !verification)
      throw invalid();
    // Reserve an attempt atomically before comparison, including successful attempts.
    const reserved = await this.prisma.emailVerification.updateMany({
      where: {
        id: verification.id,
        codeHash: verification.codeHash,
        attempts: { lt: 5 },
        expiresAt: { gt: new Date() },
      },
      data: { attempts: { increment: 1 } },
    });
    if (
      !reserved.count ||
      !(await bcrypt.compare(dto.code, verification.codeHash))
    )
      throw invalid();
    await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.emailVerification.deleteMany({
        where: {
          id: verification.id,
          codeHash: verification.codeHash,
          expiresAt: { gt: new Date() },
        },
      });
      if (!consumed.count) throw invalid();
      await tx.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: new Date() },
      });
    });
    return { message: 'Email đã xác minh. Bạn có thể đăng nhập.' };
  }

  async login(dto: LoginDto) {
    const secret = jwtSecret();
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    // Always run bcrypt, even for unknown email, to reduce timing differences.
    const hash =
      user?.passwordHash ??
      '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6Ttxw83P3ad9Qlmhb9l51mVpSmlwS';
    const matches =
      Buffer.byteLength(dto.password, 'utf8') <= 72 &&
      (await bcrypt.compare(dto.password, hash));
    if (!user || !matches || !user.isActive)
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng.');
    if (!user.emailVerifiedAt)
      throw new ForbiddenException({
        message: 'Vui lòng xác minh email trước khi đăng nhập.',
        code: 'EMAIL_NOT_VERIFIED',
      });
    const refreshToken = randomBytes(48).toString('base64url');
    const session = await this.prisma.authSession.create({
      data: {
        userId: user.id,
        familyId: randomUUID(),
        refreshTokenHash: this.tokenHash(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_SECONDS * 1000),
      },
    });
    const token = jwt.sign({ sid: session.id }, secret, {
      algorithm: 'HS256',
      subject: user.id,
      issuer: 'brewlite-api',
      audience: 'brewlite-web',
      expiresIn: SESSION_SECONDS,
    });
    const safe = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: publicUserSelect,
    });
    return { token, refreshToken, user: safe };
  }

  async authenticate(token: string | undefined): Promise<Principal> {
    if (!token) throw new UnauthorizedException('Vui lòng đăng nhập.');
    let claims: JwtPayload;
    try {
      const decoded = jwt.verify(token, jwtSecret(), {
        algorithms: ['HS256'],
        issuer: 'brewlite-api',
        audience: 'brewlite-web',
      });
      if (
        typeof decoded === 'string' ||
        typeof decoded.sub !== 'string' ||
        typeof decoded.sid !== 'string'
      )
        throw new Error('Invalid claims');
      claims = decoded;
    } catch {
      throw new UnauthorizedException(
        'Phiên đăng nhập không hợp lệ hoặc hết hạn.',
      );
    }
    const session = await this.prisma.authSession.findUnique({
      where: { id: claims.sid as string },
      include: { user: true },
    });
    if (
      !session ||
      session.userId !== claims.sub ||
      session.revokedAt ||
      session.expiresAt.getTime() <= Date.now() ||
      !session.user.isActive ||
      !session.user.emailVerifiedAt
    )
      throw new UnauthorizedException('Phiên đăng nhập đã kết thúc.');
    const user = session.user;
    return {
      sessionId: session.id,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        emailVerifiedAt: user.emailVerifiedAt,
        loyaltyPoints: user.loyaltyPoints,
      },
    };
  }

  private tokenHash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  async refresh(raw: string | undefined) {
    if (!raw) throw new UnauthorizedException('Vui lòng đăng nhập lại.');
    const parent = await this.prisma.authSession.findUnique({
      where: { refreshTokenHash: this.tokenHash(raw) },
      include: { user: true },
    });
    if (
      !parent ||
      !parent.familyId ||
      parent.expiresAt.getTime() <= Date.now() ||
      !parent.user.isActive ||
      !parent.user.emailVerifiedAt
    )
      throw new UnauthorizedException('Phiên đăng nhập đã hết hạn.');
    if (parent.revokedAt || parent.refreshUsedAt) {
      await this.prisma.authSession.updateMany({
        where: { familyId: parent.familyId },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException(
        'Refresh token đã được sử dụng. Vui lòng đăng nhập lại.',
      );
    }
    const refreshToken = randomBytes(48).toString('base64url');
    const child = await this.prisma.$transaction(async (tx) => {
      const changed = await tx.authSession.updateMany({
        where: { id: parent.id, refreshUsedAt: null, revokedAt: null },
        data: { refreshUsedAt: new Date(), revokedAt: new Date() },
      });
      if (!changed.count) return null;
      return tx.authSession.create({
        data: {
          userId: parent.userId,
          familyId: parent.familyId,
          parentId: parent.id,
          refreshTokenHash: this.tokenHash(refreshToken),
          expiresAt: parent.expiresAt,
        },
      });
    });
    if (!child) {
      await this.prisma.authSession.updateMany({
        where: { familyId: parent.familyId },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException(
        'Phiên đã thay đổi. Vui lòng đăng nhập lại.',
      );
    }
    const token = jwt.sign({ sid: child.id }, jwtSecret(), {
      algorithm: 'HS256',
      subject: parent.userId,
      issuer: 'brewlite-api',
      audience: 'brewlite-web',
      expiresIn: SESSION_SECONDS,
    });
    const safe = await this.prisma.user.findUniqueOrThrow({
      where: { id: parent.userId },
      select: publicUserSelect,
    });
    return { token, refreshToken, user: safe, expiresAt: parent.expiresAt };
  }

  async logout(sessionId: string) {
    const session = await this.prisma.authSession.findUnique({
      where: { id: sessionId },
    });
    await this.prisma.authSession.updateMany({
      where: session?.familyId
        ? { familyId: session.familyId }
        : { id: sessionId },
      data: { revokedAt: new Date() },
    });
  }
  async logoutRefresh(raw: string | undefined) {
    if (!raw) return;
    const session = await this.prisma.authSession.findUnique({
      where: { refreshTokenHash: this.tokenHash(raw) },
    });
    if (session) await this.logout(session.id);
  }
}
