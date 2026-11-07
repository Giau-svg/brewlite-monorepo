import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { InventoryService } from '../src/inventory/inventory.service';
const enabled = !!process.env.P2_TEST_DATABASE_URL;
(enabled ? describe : describe.skip)(
  'P2 schema and inventory against isolated PostgreSQL',
  () => {
    let app: INestApplication;
    let db: PrismaService;
    let inventory: InventoryService;
    let productId: string;
    let otherProductId: string;
    let sizeId: string;
    let toppingId: string;
    let customerId: string;
    let admin: string;
    let customer: string;
    let staff: string;
    beforeAll(async () => {
      const url = new URL(process.env.P2_TEST_DATABASE_URL!);
      const database = decodeURIComponent(url.pathname.slice(1));
      const schema = url.searchParams.get('schema');
      if (!database.startsWith('brewlite_p2_test_') || schema !== 'public')
        throw new Error('A dedicated P2 database is required');
      process.env.DATABASE_URL = url.toString();
      const module = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();
      app = module.createNestApplication();
      app.use(cookieParser());
      app.setGlobalPrefix('api');
      app.useGlobalPipes(
        new ValidationPipe({ whitelist: true, transform: true }),
      );
      await app.init();
      db = app.get(PrismaService);
      inventory = app.get(InventoryService);
      const current = await db.$queryRaw<
        { schema: string }[]
      >`SELECT current_schema() AS schema`;
      if (
        current[0].schema !== schema ||
        (
          await db.$queryRaw<
            { name: string }[]
          >`SELECT current_database() AS name`
        )[0].name !== database
      )
        throw new Error('Refuse writes outside the dedicated test schema');
      async function account(role: 'ADMIN' | 'CUSTOMER' | 'STAFF') {
        const password = 'P2 isolated test password';
        const email = `${randomUUID()}@example.test`;
        const user = await db.user.create({
          data: {
            fullName: 'P2 integration fixture',
            email,
            role,
            emailVerifiedAt: new Date(),
            passwordHash: await bcrypt.hash(password, 4),
          },
        });
        const response = await request(app.getHttpServer())
          .post('/api/auth/login')
          .set('Origin', 'http://localhost:3000')
          .send({ email, password })
          .expect(200);
        return {
          id: user.id,
          cookie: (
            response.headers['set-cookie'] as unknown as string[]
          )[0].split(';')[0],
        };
      }
      admin = (await account('ADMIN')).cookie;
      const c = await account('CUSTOMER');
      customer = c.cookie;
      customerId = c.id;
      staff = (await account('STAFF')).cookie;
      productId = (
        await db.product.create({
          data: { name: 'P2 test product', basePrice: '35000' },
        })
      ).id;
      otherProductId = (
        await db.product.create({
          data: { name: 'P2 other product', basePrice: '10000' },
        })
      ).id;
      sizeId = (
        await db.size.create({
          data: { productId, name: 'M', extraPrice: '0' },
        })
      ).id;
      toppingId = (
        await db.topping.create({ data: { name: 'P2 topping', price: '2000' } })
      ).id;
    });
    afterAll(async () => {
      await app?.close();
    });
    const post = (path: string, cookie = customer) =>
      request(app.getHttpServer())
        .post(`/api${path}`)
        .set('Idempotency-Key', randomUUID())
        .set('Cookie', cookie)
        .set('Origin', 'http://localhost:3000');
    const patch = (path: string, cookie = admin) =>
      request(app.getHttpServer())
        .patch(`/api${path}`)
        .set('Idempotency-Key', randomUUID())
        .set('Cookie', cookie)
        .set('Origin', 'http://localhost:3000');
    const configured = (note = '') => ({
      productId,
      sizeId,
      quantity: 1,
      toppingIds: [toppingId],
      note,
    });
    it('keeps null stock distinct from zero and rejects checkout pricing before initialization', async () => {
      expect(
        (await inventory.getAvailableStock(sizeId)).availableQuantity,
      ).toBeNull();
      await post('/cart/calculate')
        .send({ items: [configured()] })
        .expect(409);
      await expect(
        db.size.update({ where: { id: sizeId }, data: { reserved: 1 } }),
      ).rejects.toThrow();
      await expect(
        db.size.update({ where: { id: sizeId }, data: { onHand: -1 } }),
      ).rejects.toThrow();
    });
    it('uses mandatory Size Product and normalized per-product uniqueness', async () => {
      await post('/admin/sizes', admin)
        .send({ productId, name: ' m ', extraPrice: '0' })
        .expect(409);
      await post('/admin/sizes', admin)
        .send({ productId: otherProductId, name: 'm', extraPrice: '0' })
        .expect(201);
      await expect(
        db.$executeRaw`INSERT INTO sizes (id, name, "extraPrice") VALUES (${randomUUID()}, 'Orphan', 0)`,
      ).rejects.toThrow();
    });
    it('permits ADMIN inventory updates; rejects CUSTOMER/STAFF and arbitrary reserved fields', async () => {
      await expect(
        db.$transaction((tx) => inventory.setOnHand(tx, sizeId, 1.5, 0)),
      ).rejects.toThrow();
      expect((await inventory.getAvailableStock(sizeId)).onHand).toBeNull();
      await patch(`/admin/sizes/${sizeId}/inventory`, customer)
        .send({ onHand: 8, expectedVersion: 0 })
        .expect(403);
      await patch(`/admin/sizes/${sizeId}/inventory`, staff)
        .send({ onHand: 8, expectedVersion: 0 })
        .expect(403);
      await patch(`/admin/sizes/${sizeId}/inventory`)
        .send({ onHand: 8, expectedVersion: 0, reserved: 0 })
        .expect(400);
      await patch(`/admin/sizes/${sizeId}/inventory`)
        .send({ onHand: 8, expectedVersion: 0 })
        .expect(200);
      expect(
        await db.idempotencyRecord.count({
          where: { operation: 'admin.inventory.change', requestHash: sizeId },
        }),
      ).toBe(1);
    });
    it('enforces Size/Product and Topping validity in both service and DB', async () => {
      await expect(
        inventory.validateSizeBelongsToProduct(otherProductId, sizeId),
      ).rejects.toThrow();
      await post('/cart/items')
        .send({ ...configured(), productId: otherProductId })
        .expect(400);
      const inactive = await db.topping.create({
        data: { name: 'P2 inactive', price: '1000', isAvailable: false },
      });
      for (const id of [inactive.id, randomUUID()])
        await post('/cart/calculate')
          .send({ items: [{ ...configured(), toppingIds: [id] }] })
          .expect(400);
      const cart = await db.cart.create({ data: { sessionId: randomUUID() } });
      await expect(
        db.cartItem.create({
          data: {
            cartId: cart.id,
            productId: otherProductId,
            sizeId,
            quantity: 1,
          },
        }),
      ).rejects.toThrow();
    });
    it('distinguishes Size/Topping/Note, normalizes only equivalent notes and ignores client prices', async () => {
      const another = await db.size.create({
        data: { productId, name: 'L', extraPrice: '5000', onHand: 8 },
      });
      await post('/cart/items')
        .send({ ...configured(' Ít đá\r\nKhông đường '), unitPrice: '1' })
        .expect(201);
      await post('/cart/items')
        .send(configured('Ít đá\nKhông đường'))
        .expect(201);
      await post('/cart/items')
        .send({ ...configured('Ít đá\nKhông đường'), sizeId: another.id })
        .expect(201);
      await post('/cart/items')
        .send({ ...configured('Ít đá\nKhông đường'), toppingIds: [] })
        .expect(201);
      await post('/cart/items')
        .send(configured('ít đá\nKhông đường'))
        .expect(201);
      const cart = await request(app.getHttpServer())
        .get('/api/cart')
        .set('Cookie', customer)
        .expect(200);
      expect(cart.body.items).toHaveLength(4);
      expect(
        cart.body.items.some(
          (i: { quantity: number; unitPrice: string }) =>
            i.quantity === 2 && i.unitPrice === '37000',
        ),
      ).toBe(true);
      const stored = await db.cartItem.findMany({
        where: { cart: { userId: customerId } },
        include: { toppings: true },
      });
      expect(stored.every((i) => i.sizeId && i.configurationKey)).toBe(true);
      expect(stored.some((i) => i.toppings.length === 1)).toBe(true);
    });
    it('reads a legacy cart without inventing Size/Topping or changing notes and quantity', async () => {
      const user = await db.user.findUniqueOrThrow({
        where: { id: customerId },
      });
      const existing = await db.cart.findUniqueOrThrow({
        where: { userId: user.id },
      });
      const note = 'Legacy: ít  đá\nGiữ nguyên';
      const item = await db.cartItem.create({
        data: { cartId: existing.id, productId, quantity: 2, note },
      });
      const result = await request(app.getHttpServer())
        .get('/api/cart')
        .set('Cookie', customer)
        .expect(200);
      const legacy = result.body.items.find(
        (i: { id: string }) => i.id === item.id,
      );
      expect(legacy.sizeId).toBeNull();
      expect(legacy.quantity).toBe(2);
      expect(legacy.note).toBe(note);
      expect(legacy.requiresConfiguration).toBe(true);
      expect(legacy.toppings).toEqual([]);
      expect(
        (await db.cartItem.findUniqueOrThrow({ where: { id: item.id } }))
          .configurationKey,
      ).toBeNull();
    });
    it('prevents lost ADMIN updates using expectedVersion', async () => {
      const current = await inventory.getAvailableStock(sizeId);
      const results = await Promise.all([
        patch(`/admin/sizes/${sizeId}/inventory`).send({
          onHand: 7,
          expectedVersion: current.version,
        }),
        patch(`/admin/sizes/${sizeId}/inventory`).send({
          onHand: 9,
          expectedVersion: current.version,
        }),
      ]);
      expect(results.map((r) => r.status).sort((a, b) => a - b)).toEqual([
        200, 409,
      ]);
    });
    it('handles competing reserves, consume and release without negative stock', async () => {
      const sku = await db.size.create({
        data: { productId, name: 'Last SKU', extraPrice: '0', onHand: 1 },
      });
      const results = await Promise.allSettled([
        db.$transaction((tx) => inventory.reserve(tx, sku.id, 1)),
        db.$transaction((tx) => inventory.reserve(tx, sku.id, 1)),
      ]);
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      await expect(
        patch(`/admin/sizes/${sku.id}/inventory`).send({
          onHand: 0,
          expectedVersion: 1,
        }),
      ).resolves.toMatchObject({ status: 400 });
      await db.$transaction((tx) => inventory.consume(tx, sku.id, 1));
      expect((await inventory.getAvailableStock(sku.id)).onHand).toBe(0);
      await expect(
        db.$transaction((tx) => inventory.consume(tx, sku.id, 1)),
      ).rejects.toThrow();
      const held = await db.size.create({
        data: { productId, name: 'Release SKU', extraPrice: '0', onHand: 2 },
      });
      await db.$transaction((tx) => inventory.reserve(tx, held.id, 1));
      await db.$transaction((tx) => inventory.release(tx, held.id, 1));
      const result = await inventory.getAvailableStock(held.id);
      expect(result.onHand).toBe(2);
      expect(result.reserved).toBe(0);
    });
    it('allows multiple payment attempts but only one SUCCESS, without creating a checkout flow', async () => {
      const order = await db.order.create({
        data: {
          orderCode: `P2-${randomUUID()}`,
          subtotal: '10000',
          finalTotal: '10000',
        },
      });
      await db.payment.create({
        data: {
          orderId: order.id,
          amount: '10000',
          method: 'WALLET',
          status: 'FAILED',
          attemptNumber: 1,
        },
      });
      await db.payment.create({
        data: {
          orderId: order.id,
          amount: '10000',
          method: 'CARD',
          status: 'SUCCESS',
          attemptNumber: 2,
        },
      });
      await expect(
        db.payment.create({
          data: {
            orderId: order.id,
            amount: '10000',
            method: 'CARD',
            status: 'SUCCESS',
            attemptNumber: 3,
          },
        }),
      ).rejects.toThrow();
      expect(await db.payment.count({ where: { orderId: order.id } })).toBe(2);
      expect(
        await db.orderReservation.count({ where: { orderId: order.id } }),
      ).toBe(0);
    });
  },
);
