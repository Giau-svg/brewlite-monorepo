import { CommerceService } from '../src/commerce/commerce.service';
import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { EmailService } from '../src/auth/email.service';
const enabled = !!process.env.AUTH_TEST_DATABASE_URL;
(enabled ? describe : describe.skip)(
  'Store HTTP transaction integration (isolated PostgreSQL)',
  () => {
    let app: INestApplication;
    let db: PrismaService;
    let admin: string;
    let customer: string;
    let staff: string;
    let other: string;
    let customerId: string;
    let productId: string;
    let sizeId: string;
    let toppingId: string;
    const password = 'Isolated integration password';
    const body = () => ({
      productId,
      sizeId,
      quantity: 1,
      toppingIds: [toppingId],
      note: 'Ít đá',
    });
    beforeAll(async () => {
      const url = new URL(process.env.AUTH_TEST_DATABASE_URL!);
      if (!url.searchParams.get('schema')?.startsWith('brewlite_auth_test_'))
        throw new Error('Dedicated test schema required');
      process.env.DATABASE_URL = url.toString();
      const module = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(EmailService)
        .useValue({ sendVerification: async () => {} })
        .compile();
      app = module.createNestApplication();
      app.use(cookieParser());
      app.setGlobalPrefix('api');
      app.useGlobalPipes(
        new ValidationPipe({ whitelist: true, transform: true }),
      );
      await app.init();
      db = app.get(PrismaService);
      async function account(role: 'ADMIN' | 'CUSTOMER' | 'STAFF') {
        // Fixtures only in dedicated test schema; never bootstrap real users this way.
        const email = `${randomUUID()}@example.test`;
        const u = await db.user.create({
          data: {
            fullName: 'Integration fixture',
            email,
            role,
            emailVerifiedAt: new Date(),
            passwordHash: await bcrypt.hash(password, 4),
          },
        });
        const res = await request(app.getHttpServer())
          .post('/api/auth/login')
          .set('Origin', 'http://localhost:3000')
          .send({ email, password })
          .expect(200);
        return {
          id: u.id,
          cookie: (res.headers['set-cookie'] as unknown as string[])[0].split(
            ';',
          )[0],
        };
      }
      admin = (await account('ADMIN')).cookie;
      staff = (await account('STAFF')).cookie;
      const c = await account('CUSTOMER');
      customer = c.cookie;
      customerId = c.id;
      other = (await account('CUSTOMER')).cookie;
    });
    afterAll(async () => {
      await app?.close();
    });
    const get = (path: string, cookie: string) =>
      request(app.getHttpServer()).get(`/api${path}`).set('Cookie', cookie);
    const post = (path: string, cookie: string, key = randomUUID()) =>
      request(app.getHttpServer())
        .post(`/api${path}`)
        .set('Cookie', cookie)
        .set('Origin', 'http://localhost:3000')
        .set('Idempotency-Key', key);
    const patch = (path: string, cookie: string, key = randomUUID()) =>
      request(app.getHttpServer())
        .patch(`/api${path}`)
        .set('Cookie', cookie)
        .set('Origin', 'http://localhost:3000')
        .set('Idempotency-Key', key);
    it('protects ADMIN and STAFF APIs against CUSTOMER/STAFF access', async () => {
      await get('/admin/products', customer).expect(403);
      await get('/admin/products', staff).expect(403);
      await get('/staff/orders', customer).expect(403);
    });
    it('creates catalog through ADMIN APIs; initializes Size inventory explicitly', async () => {
      const category = await post('/admin/categories', admin)
        .send({ name: `Category ${randomUUID()}` })
        .expect(201);
      const product = await post('/admin/products', admin)
        .send({
          name: 'HTTP product',
          categoryId: category.body.id,
          basePrice: '35000',
          description: 'HTTP integration',
          imageUrl: '',
        })
        .expect(201);
      productId = product.body.id;
      const size = await post('/admin/sizes', admin)
        .send({ name: 'M', productId, extraPrice: '5000' })
        .expect(201);
      sizeId = size.body.id;
      expect(size.body.onHand).toBeNull();
      const detail = await get('/products/' + productId, customer).expect(200);
      expect(detail.body.sizes[0].inventoryStatus).toBe('UNINITIALIZED');
      expect(detail.body.sizes[0].availableQuantity).toBeNull();
      const topping = await post('/admin/toppings', admin)
        .send({ name: `HTTP topping ${randomUUID()}`, price: '2000' })
        .expect(201);
      toppingId = topping.body.id;
      await post('/cart/items', customer).send(body()).expect(409);
      await patch(`/admin/sizes/${sizeId}/inventory`, admin)
        .send({ onHand: 2, expectedVersion: 0 })
        .expect(200);
      const products = await get('/products', customer).expect(200);
      expect(
        products.body.some((p: { id: string }) => p.id === productId),
      ).toBe(true);
    });
    async function create(cookie: string, key = randomUUID()) {
      const cart = await get('/cart', cookie).expect(200);
      const quote = await post('/cart/calculate', cookie)
        .send({
          items: cart.body.items.map(
            (i: {
              productId: string;
              sizeId: string;
              quantity: number;
              note: string;
              toppings: { id: string }[];
            }) => ({ ...i, toppingIds: i.toppings.map((t) => t.id) }),
          ),
        })
        .expect(200);
      expect(quote.body.finalTotal).toBe('42000');
      const data = {
        cartVersion: cart.body.version,
        quoteFingerprint: quote.body.quoteFingerprint,
      };
      return { key, data, send: () => post('/orders', cookie, key).send(data) };
    }
    let orderId: string;
    let racedOrderId: string;
    let racedCookie: string;
    it('merges once, reserves inventory and creates a single order under retries', async () => {
      const key = randomUUID();
      await post('/cart/merge', customer, key)
        .send({ items: [body()] })
        .expect(200);
      await post('/cart/merge', customer, key)
        .send({ items: [body()] })
        .expect(200);
      const cart = await get('/cart', customer).expect(200);
      expect(cart.body.items).toHaveLength(1);
      expect(cart.body.items[0].quantity).toBe(1);
      const action = await create(customer);
      const created = await action.send().expect(201);
      orderId = created.body.id;
      expect(created.body.status).toBe('PENDING_PAYMENT');
      expect((await action.send().expect(201)).body.id).toBe(orderId);
      expect(
        (await db.size.findUniqueOrThrow({ where: { id: sizeId } })).reserved,
      ).toBe(1);
      await get(`/orders/${orderId}`, other).expect(404);
      await post('/orders', customer, action.key)
        .send({ ...action.data, pointsUsed: 1 })
        .expect(409);
    });
    it('does not allow payment bypass, handles UNKNOWN before retry/cancel and consumes once', async () => {
      await patch(`/staff/orders/${orderId}/status`, staff)
        .send({ expectedVersion: 0, nextStatus: 'PREPARING' })
        .expect(409);
      process.env.MOCK_PAYMENT_OUTCOME = 'UNKNOWN';
      const key = randomUUID();
      const attempt = await post(`/orders/${orderId}/payments`, customer, key)
        .send({ method: 'WALLET', status: 'SUCCESS' })
        .expect(201);
      expect(attempt.body.status).toBe('UNKNOWN');
      await post(`/orders/${orderId}/cancel`, customer).send({}).expect(409);
      await post(`/orders/${orderId}/payments`, customer)
        .send({ method: 'CARD' })
        .expect(409);
      process.env.MOCK_PAYMENT_OUTCOME = 'SUCCESS';
      await get(`/payments/${attempt.body.id}`, customer).expect(200);
      await post(`/orders/${orderId}/payments`, customer, key)
        .send({ method: 'WALLET' })
        .expect(201);
      const size = await db.size.findUniqueOrThrow({ where: { id: sizeId } });
      expect(size.onHand).toBe(1);
      expect(size.reserved).toBe(0);
      expect(
        await db.paymentEvent.count({ where: { paymentId: attempt.body.id } }),
      ).toBe(1);
    });
    it('STAFF follows sequential statuses; awards points exactly once on COMPLETED', async () => {
      const o = await get(`/orders/${orderId}`, customer).expect(200);
      await patch(`/staff/orders/${orderId}/status`, admin)
        .send({ expectedVersion: o.body.version, nextStatus: 'PREPARING' })
        .expect(403);
      await patch(`/staff/orders/${orderId}/status`, staff)
        .send({ expectedVersion: o.body.version, nextStatus: 'READY' })
        .expect(409);
      let version = o.body.version;
      for (const nextStatus of ['PREPARING', 'READY', 'COMPLETED']) {
        const key = randomUUID();
        const payload = { expectedVersion: version, nextStatus };
        const next = await patch(`/staff/orders/${orderId}/status`, staff, key)
          .send(payload)
          .expect(200);
        expect(
          (
            await patch(`/staff/orders/${orderId}/status`, staff, key)
              .send(payload)
              .expect(200)
          ).body.id,
        ).toBe(orderId);
        version = next.body.version;
      }
      expect(
        await db.loyaltyTransaction.count({
          where: { userId: customerId, orderId, type: 'EARN' },
        }),
      ).toBe(1);
      expect(
        (await db.user.findUniqueOrThrow({ where: { id: customerId } }))
          .loyaltyPoints,
      ).toBe(4);
      const dashboard = await get('/admin/dashboard', admin).expect(200);
      expect(dashboard.body.simulatedRevenue).toBe('42000');
    });
    it('two customers competing for the final SKU cannot oversell', async () => {
      await post('/cart/items', customer).send(body()).expect(201);
      await post('/cart/items', other).send(body()).expect(201);
      const a = await create(customer);
      const b = await create(other);
      const results = await Promise.all([a.send(), b.send()]);
      racedOrderId = results.find((r) => r.status === 201)!.body.id;
      racedCookie = results[0].status === 201 ? customer : other;
      expect(results.map((r) => r.status).sort((a, b) => a - b)).toEqual([
        201, 409,
      ]);
      const size = await db.size.findUniqueOrThrow({ where: { id: sizeId } });
      expect(size.reserved).toBe(1);
      expect(size.onHand).toBe(1);
    });
    it('FAILED leaves stock held; cancellation releases exactly once with an idempotency key', async () => {
      process.env.MOCK_PAYMENT_OUTCOME = 'FAILED';
      const response = await post(
        `/orders/${racedOrderId}/payments`,
        racedCookie,
      )
        .send({ method: 'CARD' })
        .expect(201);
      expect(response.body.status).toBe('FAILED');
      expect(
        (await db.size.findUniqueOrThrow({ where: { id: sizeId } })).reserved,
      ).toBe(1);
      const key = randomUUID();
      await post(`/orders/${racedOrderId}/cancel`, racedCookie, key)
        .send({})
        .expect(200);
      await post(`/orders/${racedOrderId}/cancel`, racedCookie, key)
        .send({})
        .expect(200);
      const size = await db.size.findUniqueOrThrow({ where: { id: sizeId } });
      expect(size.reserved).toBe(0);
      expect(size.onHand).toBe(1);
      process.env.MOCK_PAYMENT_OUTCOME = 'SUCCESS';
    });
    it('applies coupon/points authoritatively and releases holds on expiry, without consuming stock', async () => {
      const category = await post('/admin/categories', admin)
        .send({ name: `Pricing ${randomUUID()}` })
        .expect(201);
      const product = await post('/admin/products', admin)
        .send({
          name: 'Pricing fixture',
          categoryId: category.body.id,
          basePrice: '100000',
        })
        .expect(201);
      const size = await post('/admin/sizes', admin)
        .send({ name: 'M', productId: product.body.id, extraPrice: '0' })
        .expect(201);
      await patch(`/admin/sizes/${size.body.id}/inventory`, admin)
        .send({ onHand: 10, expectedVersion: 0 })
        .expect(200);
      const couponCode = `HTTP${randomUUID().slice(0, 8).toUpperCase()}`;
      const promotion = await post('/admin/promotions', admin)
        .send({
          code: couponCode,
          discountType: 'FIXED_AMOUNT',
          discountValue: '10000',
          usageLimit: 1,
          startDate: new Date(Date.now() - 60000).toISOString(),
          endDate: new Date(Date.now() + 3600000).toISOString(),
        })
        .expect(201);
      // Points fixture restricted to this schema; never adjusts an operating customer's balance.
      await db.user.update({
        where: { id: customerId },
        data: { loyaltyPoints: 100 },
      });
      const existing = await get('/cart', customer).expect(200);
      for (const i of existing.body.items)
        await request(app.getHttpServer())
          .delete(`/api/cart/items/${i.id}`)
          .set('Idempotency-Key', randomUUID())
          .set('Cookie', customer)
          .set('Origin', 'http://localhost:3000')
          .send({})
          .expect(200);
      const item = {
        productId: product.body.id,
        sizeId: size.body.id,
        quantity: 1,
        toppingIds: [],
        note: '',
      };
      await post('/cart/items', customer).send(item).expect(201);
      const quoteBody = { items: [item], couponCode, pointsUsed: 100 };
      const quote = await post('/cart/calculate', customer)
        .send(quoteBody)
        .expect(200);
      expect(quote.body.finalTotal).toBe('80000');
      expect(
        (await db.size.findUniqueOrThrow({ where: { id: size.body.id } }))
          .reserved,
      ).toBe(0);
      await post('/cart/calculate', customer)
        .send({ ...quoteBody, pointsUsed: 181 })
        .expect(422);
      const cart = await get('/cart', customer).expect(200);
      const order = await post('/orders', customer)
        .send({
          cartVersion: cart.body.version,
          quoteFingerprint: quote.body.quoteFingerprint,
          couponCode,
          pointsUsed: 100,
        })
        .expect(201);
      expect(
        (await db.user.findUniqueOrThrow({ where: { id: customerId } }))
          .reservedPoints,
      ).toBe(100);
      expect(
        (
          await db.promotion.findUniqueOrThrow({
            where: { id: promotion.body.id },
          })
        ).reservedCount,
      ).toBe(1);
      const expired = new Date(Date.now() - 1000);
      await db.order.update({
        where: { id: order.body.id },
        data: { expiresAt: expired },
      });
      await db.orderReservation.update({
        where: { orderId: order.body.id },
        data: { expiresAt: expired },
      });
      await app.get(CommerceService).reconcile();
      await app.get(CommerceService).reconcile();
      expect(
        (await get(`/orders/${order.body.id}`, customer).expect(200)).body
          .status,
      ).toBe('CANCELLED');
      const user = await db.user.findUniqueOrThrow({
        where: { id: customerId },
      });
      expect(user.reservedPoints).toBe(0);
      expect(user.loyaltyPoints).toBe(100);
      const p = await db.promotion.findUniqueOrThrow({
        where: { id: promotion.body.id },
      });
      expect(p.reservedCount).toBe(0);
      expect(p.usedCount).toBe(0);
      const inventory = await db.size.findUniqueOrThrow({
        where: { id: size.body.id },
      });
      expect(inventory.onHand).toBe(10);
      expect(inventory.reserved).toBe(0);
    });
  },
);
