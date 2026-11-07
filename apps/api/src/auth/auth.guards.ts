import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import { AuthService, type Principal } from './auth.service';
import { allowedOrigins, AUTH_COOKIE } from './auth.config';

export type AuthRequest = Request & { principal: Principal };
export function sessionCookie(request: Request): string | undefined {
  const cookies = request.cookies as Record<string, unknown> | undefined;
  return typeof cookies?.[AUTH_COOKIE] === 'string'
    ? cookies[AUTH_COOKIE]
    : undefined;
}
@Injectable()
export class OriginGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true;
    if (
      !request.headers.origin ||
      !allowedOrigins().includes(request.headers.origin)
    )
      throw new ForbiddenException('Nguồn yêu cầu không được chấp nhận.');
    return true;
  }
}
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    context
      .switchToHttp()
      .getResponse<Response>()
      .setHeader('Cache-Control', 'no-store');
    request.principal = await this.auth.authenticate(sessionCookie(request));
    return true;
  }
}
export const Roles = (...roles: UserRole[]) => SetMetadata('auth:roles', roles);
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<UserRole[]>('auth:roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    const { principal } = context.switchToHttp().getRequest<AuthRequest>();
    if (!roles || !principal || !roles.includes(principal.user.role))
      throw new ForbiddenException(
        'Bạn không có quyền thực hiện thao tác này.',
      );
    return true;
  }
}
