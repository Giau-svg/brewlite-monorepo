import {
  ForbiddenException,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import {
  OriginGuard,
  RolesGuard,
  JwtAuthGuard,
  sessionCookie,
} from './auth.guards';
import { AuthService } from './auth.service';
import { cookieOptions } from './auth.config';
import type { Request } from 'express';

function context(request: object): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({ setHeader: jest.fn() }),
    }),
    getHandler: () => () => {},
    getClass: () => class {},
  } as unknown as ExecutionContext;
}
afterEach(() => {
  jest.restoreAllMocks();
});
describe('authentication boundaries', () => {
  it('rejects mutation requests without an allowed Origin', () => {
    const guard = new OriginGuard();
    expect(() =>
      guard.canActivate(context({ method: 'POST', headers: {} })),
    ).toThrow(ForbiddenException);
    expect(() =>
      guard.canActivate(
        context({ method: 'POST', headers: { origin: 'https://evil.test' } }),
      ),
    ).toThrow(ForbiddenException);
    expect(guard.canActivate(context({ method: 'GET', headers: {} }))).toBe(
      true,
    );
  });
  it('requires ADMIN metadata and the authenticated role, never a request body role', () => {
    const reflector = new Reflector();
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([UserRole.ADMIN]);
    const guard = new RolesGuard(reflector);
    expect(() =>
      guard.canActivate(
        context({
          body: { role: 'ADMIN' },
          principal: { user: { role: UserRole.CUSTOMER } },
        }),
      ),
    ).toThrow(ForbiddenException);
    expect(
      guard.canActivate(
        context({ principal: { user: { role: UserRole.ADMIN } } }),
      ),
    ).toBe(true);
  });
  it('only accepts the designated session cookie and propagates verification failure', async () => {
    const authenticate = jest
      .fn()
      .mockRejectedValue(new UnauthorizedException());
    const guard = new JwtAuthGuard({ authenticate } as unknown as AuthService);
    await expect(
      guard.canActivate(
        context({ headers: { authorization: 'Bearer fake' }, cookies: {} }),
      ),
    ).rejects.toThrow(UnauthorizedException);
    expect(authenticate).toHaveBeenCalledWith(undefined);
    expect(
      sessionCookie({
        cookies: { brewlite_session: 'token' },
      } as unknown as Request),
    ).toBe('token');
  });
  it('uses secure HttpOnly cookies in production and matching paths when clearing', () => {
    const before = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      expect(cookieOptions()).toMatchObject({
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/api',
      });
    } finally {
      process.env.NODE_ENV = before;
    }
  });
});
