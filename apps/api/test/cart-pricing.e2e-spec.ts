import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
const enabled = !!process.env.AUTH_TEST_DATABASE_URL;
(enabled ? describe : describe.skip)(
  'Catalog and pricing HTTP integration (isolated fixtures, no seed)',
  () => {
    let app: INestApplication;
    let db: PrismaService;
    let cookie: string;
    let productId: string;
    let sizeId: string;
    let toppingId: string;
    beforeAll(async () => {
      const url = new URL(process.env.AUTH_TEST_DATABASE_URL!);
      if (!url.searchParams.get('schema')?.startsWith('brewlite_auth_test_'))
        throw new Error('Dedicated schema required');
      process.env.DATABASE_URL = url.toString();
      const module = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();
      app = module.createNestApplication();
      app.use(cookieParser());
      app.useGlobalPipes(
        new ValidationPipe({ whitelist: true, transform: true }),
      );
      app.setGlobalPrefix('api');
      await app.init();
      db = app.get(PrismaService);
      const password = 'Isolated pricing password';
      const email = `${randomUUID()}@example.test`;
      await db.user.create({
        data: {
          fullName: 'Pricing fixture',
          email,
          passwordHash: await bcrypt.hash(password, 4),
          emailVerifiedAt: new Date(),
        },
      });
      const logged = await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('Origin', 'http://localhost:3000')
        .send({ email, password })
        .expect(200);
      cookie = (logged.headers['set-cookie'] as unknown as string[])[0].split(
        ';',
      )[0];
      const p = await db.product.create({
        data: {
          name: 'Pricing integration fixture',
          basePrice: '35000',
          sizes: { create: { name: 'M', extraPrice: '5000', onHand: 10 } },
        },
        include: { sizes: true },
      });
      productId = p.id;
      sizeId = p.sizes[0].id;
      toppingId = (
        await db.topping.create({
          data: { name: `Pricing topping ${randomUUID()}`, price: '2000' },
        })
      ).id;
    });
    afterAll(async () => {
      await app?.close();
    });
    it('returns available toppings without requiring a seed dataset', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/toppings')
        .expect(200);
      expect(
        res.body.some(
          (t: { id: string; price: string }) =>
            t.id === toppingId && t.price === '2000',
        ),
      ).toBe(true);
    });
    it('quotes using database prices and string VND, ignores client price and does not reserve', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/cart/calculate')
        .set('Cookie', cookie)
        .set('Origin', 'http://localhost:3000')
        .send({
          items: [
            {
              productId,
              sizeId,
              toppingIds: [toppingId],
              quantity: 2,
              unitPrice: '1',
            },
          ],
        })
        .expect(200);
      expect(res.body.subtotal).toBe('84000');
      expect(res.body.finalTotal).toBe('84000');
      expect(typeof res.body.quoteFingerprint).toBe('string');
      expect(
        (await db.size.findUniqueOrThrow({ where: { id: sizeId } })).reserved,
      ).toBe(0);
    });
  },
);
