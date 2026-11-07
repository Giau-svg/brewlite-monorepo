import { ServiceUnavailableException } from '@nestjs/common';
import type { CookieOptions } from 'express';

export const AUTH_COOKIE = 'brewlite_session';
export const SESSION_SECONDS = 15 * 60;
export function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (
    !secret ||
    Buffer.byteLength(secret) < 32 ||
    secret.includes('change-in-production')
  ) {
    throw new ServiceUnavailableException(
      'Cấu hình JWT_SECRET riêng, ngẫu nhiên tối thiểu 32 byte trước khi đăng nhập.',
    );
  }
  return secret;
}
export function allowedOrigins() {
  return (process.env.FRONTEND_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
export function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api',
  };
}
export const REFRESH_COOKIE = 'brewlite_refresh';
export const REFRESH_SECONDS = 7 * 24 * 60 * 60;
export function refreshCookieOptions(): CookieOptions {
  return { ...cookieOptions(), path: '/api/auth' };
}
