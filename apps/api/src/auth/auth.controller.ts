import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { EmailDto, LoginDto, RegisterDto, VerifyEmailDto } from './auth.dto';
import type { AuthRequest } from './auth.guards';
import { JwtAuthGuard, OriginGuard, sessionCookie } from './auth.guards';
import {
  AUTH_COOKIE,
  cookieOptions,
  SESSION_SECONDS,
  REFRESH_COOKIE,
  REFRESH_SECONDS,
  refreshCookieOptions,
} from './auth.config';

@Controller('auth')
@UseGuards(ThrottlerGuard, OriginGuard)
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('resend-otp')
  @HttpCode(200)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  resend(@Body() dto: EmailDto) {
    return this.auth.resend(dto.email);
  }

  @Post('verify-email')
  @HttpCode(200)
  verify(@Body() dto: VerifyEmailDto) {
    return this.auth.verifyEmail(dto);
  }

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 900000 } })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.login(dto);
    response.setHeader('Cache-Control', 'no-store');
    response.cookie(AUTH_COOKIE, result.token, {
      ...cookieOptions(),
      maxAge: SESSION_SECONDS * 1000,
    });
    response.cookie(REFRESH_COOKIE, result.refreshToken, {
      ...refreshCookieOptions(),
      maxAge: REFRESH_SECONDS * 1000,
    });
    return { user: result.user };
  }
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const cookies = request.cookies as Record<string, unknown> | undefined;
    try {
      const result = await this.auth.refresh(
        typeof cookies?.[REFRESH_COOKIE] === 'string'
          ? cookies[REFRESH_COOKIE]
          : undefined,
      );
      response.cookie(AUTH_COOKIE, result.token, {
        ...cookieOptions(),
        maxAge: SESSION_SECONDS * 1000,
      });
      response.cookie(REFRESH_COOKIE, result.refreshToken, {
        ...refreshCookieOptions(),
        maxAge: result.expiresAt.getTime() - Date.now(),
      });
      response.setHeader('Cache-Control', 'no-store');
      return { user: result.user };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        response.clearCookie(AUTH_COOKIE, cookieOptions());
        response.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
      }
      throw error;
    }
  }
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(
    @Req() request: AuthRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    response.setHeader('Cache-Control', 'no-store');
    return { user: request.principal.user };
  }
  @Post('logout')
  @HttpCode(200)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      const principal = await this.auth.authenticate(sessionCookie(request));
      await this.auth.logout(principal.sessionId);
    } catch (error) {
      if (!(error instanceof UnauthorizedException)) throw error;
    }
    const cookies = request.cookies as Record<string, unknown> | undefined;
    await this.auth.logoutRefresh(
      typeof cookies?.[REFRESH_COOKIE] === 'string'
        ? cookies[REFRESH_COOKIE]
        : undefined,
    );
    response.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
    response.clearCookie(AUTH_COOKIE, cookieOptions());
    response.setHeader('Cache-Control', 'no-store');
    return { message: 'Đã đăng xuất.' };
  }
}
