import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomUUID, randomBytes } from 'node:crypto';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { EmailService } from '../src/auth/email.service';

// Run only against an explicitly supplied dedicated test schema, never the normal database URL.
const enabled = !!process.env.AUTH_TEST_DATABASE_URL;
(enabled ? describe : describe.skip)(
  'email authentication HTTP integration',
  () => {
    let app: INestApplication;
    let db: PrismaService;
    const codes = new Map<string, string>();
    const email = `customer-${randomUUID()}@example.test`;
    const password = 'BrewLite secure password 2026';
    let cookie: string;
    let userId: string;
    beforeAll(async () => {
      const url = new URL(process.env.AUTH_TEST_DATABASE_URL!);
      if (!url.searchParams.get('schema')?.startsWith('brewlite_auth_test_'))
        throw new Error('A dedicated brewlite_auth_test_ schema is required');
      process.env.DATABASE_URL = url.toString();
      process.env.JWT_SECRET = randomBytes(48).toString('hex');
      process.env.FRONTEND_ORIGIN = 'http://localhost:3000';
      const module = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(EmailService)
        .useValue({
          sendVerification: async (address: string, code: string) => {
            codes.set(address, code);
          },
        })
        .compile();
      app = module.createNestApplication();
      app.use(cookieParser());
      app.useGlobalPipes(
        new ValidationPipe({ whitelist: true, transform: true }),
      );
      app.setGlobalPrefix('api');
      await app.init();
      db = app.get(PrismaService);
    });
    afterAll(async () => {
      await app?.close();
    });
    const post = (path: string) =>
      request(app.getHttpServer())
        .post(`/api${path}`)
        .set('Origin', 'http://localhost:3000');

    it('rejects CSRF origins and never allows self-assigned ADMIN', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .set('Origin', 'https://evil.test')
        .send({ email, password, fullName: 'Customer' })
        .expect(403);
      const result = await post('/auth/register')
        .send({ email, password, fullName: 'Customer', role: 'ADMIN' })
        .expect(201);
      expect(result.body).not.toHaveProperty('code');
      const user = await db.user.findUniqueOrThrow({ where: { email } });
      userId = user.id;
      expect(user.role).toBe('CUSTOMER');
      expect(user.emailVerifiedAt).toBeNull();
      expect(user.passwordHash).not.toBe(password);
      expect(await bcrypt.compare(password, user.passwordHash)).toBe(true);
      const otp = await db.emailVerification.findUniqueOrThrow({
        where: { userId },
      });
      expect(otp.codeHash).not.toBe(codes.get(email));
      expect(await bcrypt.compare(codes.get(email)!, otp.codeHash)).toBe(true);
    });
    it('blocks login before verification and rejects wrong OTP', async () => {
      await post('/auth/login').send({ email, password }).expect(403);
      const wrong = codes.get(email) === '000000' ? '111111' : '000000';
      await post('/auth/verify-email').send({ email, code: wrong }).expect(400);
      expect(
        (await db.emailVerification.findUniqueOrThrow({ where: { userId } }))
          .attempts,
      ).toBe(1);
    });
    it('consumes OTP once and does not send again within the cooldown', async () => {
      const before = codes.get(email);
      await post('/auth/resend-otp').send({ email }).expect(200);
      expect(codes.get(email)).toBe(before);
      await post('/auth/verify-email')
        .send({ email, code: before })
        .expect(200);
      await post('/auth/verify-email')
        .send({ email, code: before })
        .expect(400);
    });
    it('rejects wrong passwords, sets HttpOnly cookie, and exposes no token/hash', async () => {
      await post('/auth/login')
        .send({ email, password: 'wrong-password' })
        .expect(401);
      const response = await post('/auth/login')
        .send({ email, password })
        .expect(200);
      const cookies = response.headers['set-cookie'] as unknown as string[];
      expect(cookies[0]).toMatch(/HttpOnly/i);
      expect(cookies[0]).toMatch(/SameSite=Lax/i);
      expect(cookies[0]).toMatch(/Path=\/api/i);
      cookie = cookies[0].split(';')[0];
      expect(response.body).not.toHaveProperty('token');
      expect(response.body.user).not.toHaveProperty('passwordHash');
      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Cookie', cookie)
        .expect(200);
    });
    it('protects cart and ADMIN routes, using the current database role', async () => {
      await request(app.getHttpServer()).get('/api/cart').expect(401);
      await request(app.getHttpServer()).get('/api/admin/users').expect(401);
      await request(app.getHttpServer())
        .get('/api/admin/users')
        .set('Cookie', cookie)
        .expect(403);
      await post('/cart/calculate')
        .set('Cookie', cookie)
        .send({ items: [], userId: 'someone-else' })
        .expect(400);
      await db.user.update({ where: { id: userId }, data: { role: 'ADMIN' } });
      const response = await request(app.getHttpServer())
        .get('/api/admin/users')
        .set('Cookie', cookie)
        .expect(200);
      expect(response.body[0]).not.toHaveProperty('passwordHash');
      await db.user.update({
        where: { id: userId },
        data: { role: 'CUSTOMER' },
      });
    });
    it('rejects forged and expired JWT cookies', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Cookie', 'brewlite_session=forged')
        .expect(401);
      const expired = jwt.sign({ sid: randomUUID() }, process.env.JWT_SECRET!, {
        subject: userId,
        issuer: 'brewlite-api',
        audience: 'brewlite-web',
        expiresIn: -1,
      });
      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Cookie', `brewlite_session=${expired}`)
        .expect(401);
    });
    it('rotates refresh cookies and revokes the whole family on token reuse', async () => {
      const logged = await post('/auth/login')
        .send({ email, password })
        .expect(200);
      const original = (
        logged.headers['set-cookie'] as unknown as string[]
      ).map((c) => c.split(';')[0]);
      const refreshCookie = original.find((c) =>
        c.startsWith('brewlite_refresh='),
      )!;
      const rotated = await post('/auth/refresh')
        .set('Cookie', refreshCookie)
        .expect(200);
      const nextCookies = (
        rotated.headers['set-cookie'] as unknown as string[]
      ).map((c) => c.split(';')[0]);
      expect(
        nextCookies.find((c) => c.startsWith('brewlite_refresh=')),
      ).not.toBe(refreshCookie);
      expect(rotated.body).not.toHaveProperty('token');
      await post('/auth/refresh').set('Cookie', refreshCookie).expect(401);
      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Cookie', nextCookies[0])
        .expect(401);
    });
    it('logs out with only a refresh cookie after the access cookie expires', async () => {
      const logged = await post('/auth/login')
        .send({ email, password })
        .expect(200);
      const cookies = (logged.headers['set-cookie'] as unknown as string[]).map(
        (c) => c.split(';')[0],
      );
      const refresh = cookies.find((c) => c.startsWith('brewlite_refresh='))!;
      await post('/auth/logout').set('Cookie', refresh).expect(200);
      await post('/auth/refresh').set('Cookie', refresh).expect(401);
    });
    it('revokes the session on logout and clears the cookie', async () => {
      const response = await post('/auth/logout')
        .set('Cookie', cookie)
        .expect(200);
      expect(
        (response.headers['set-cookie'] as unknown as string[])[0],
      ).toMatch(/Expires=Thu, 01 Jan 1970/i);
      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Cookie', cookie)
        .expect(401);
    });
    it('rejects expired OTP and locks the fifth failed attempt', async () => {
      const address = `otp-${randomUUID()}@example.test`;
      await post('/auth/register')
        .send({ email: address, password, fullName: 'OTP' })
        .expect(201);
      const user = await db.user.findUniqueOrThrow({
        where: { email: address },
      });
      await db.emailVerification.update({
        where: { userId: user.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      await post('/auth/verify-email')
        .send({ email: address, code: codes.get(address) })
        .expect(400);
      await db.emailVerification.update({
        where: { userId: user.id },
        data: { expiresAt: new Date(Date.now() + 60000), attempts: 4 },
      });
      await post('/auth/verify-email')
        .send({ email: address, code: '000000' })
        .expect(400);
      await post('/auth/verify-email')
        .send({ email: address, code: codes.get(address) })
        .expect(400);
    });
    it('rate limits repeated OTP email requests', async () => {
      let limited = false;
      for (let index = 0; index < 4; index++) {
        const result = await post('/auth/resend-otp').send({
          email: 'unknown@example.test',
        });
        if (result.status === 429) limited = true;
      }
      expect(limited).toBe(true);
    });
  },
);
