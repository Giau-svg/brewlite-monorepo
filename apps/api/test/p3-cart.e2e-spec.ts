import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

(process.env.P3_TEST_DATABASE_URL ? describe : describe.skip)('P3 real Cart/Inventory HTTP integration, dedicated DATABASE', () => {
  let app: INestApplication; let db: PrismaService;
  let customer: string; let other: string; let admin: string; let staff: string; let userId: string;
  let productId: string; let otherProduct: string; let sizeId: string; let sizeB: string; let noStock: string; let topping: string; let disabled: string;
  const password = 'P3 isolated browser password';
  const accounts: { email: string; role: string }[] = [];
  const get = (cookie = customer) => request(app.getHttpServer()).get('/api/cart').set('Cookie', cookie);
  const post = (path: string, body: object, key = randomUUID(), cookie = customer) => request(app.getHttpServer()).post(`/api${path}`).set('Cookie', cookie).set('Origin', 'http://localhost:3000').set('Idempotency-Key', key).send(body);
  const patch = (id: string, body: object, key = randomUUID(), cookie = customer) => request(app.getHttpServer()).patch(`/api/cart/items/${id}`).set('Cookie', cookie).set('Origin', 'http://localhost:3000').set('Idempotency-Key', key).send(body);
  const remove = (id: string, body: object = {}, key = randomUUID(), cookie = customer) => request(app.getHttpServer()).delete(`/api/cart/items/${id}`).set('Cookie', cookie).set('Origin', 'http://localhost:3000').set('Idempotency-Key', key).send(body);
  const item = (note = '') => ({ productId, sizeId, toppingIds: [topping], quantity: 1, note });
  beforeAll(async () => {
    const url = new URL(process.env.P3_TEST_DATABASE_URL!); const name = decodeURIComponent(url.pathname.slice(1));
    if (!name.startsWith('brewlite_p3_test_')) throw new Error('Dedicated P3 DATABASE required');
    process.env.DATABASE_URL = url.toString();
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication(); app.use(cookieParser()); app.enableCors({ origin: 'http://localhost:3000', credentials: true }); app.setGlobalPrefix('api'); app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true })); await app.init(); db = app.get(PrismaService);
    if ((await db.$queryRaw<{ name: string }[]>`SELECT current_database() AS name`)[0].name !== name) throw new Error('Refuse fixtures outside P3 test database');
    async function account(role: 'ADMIN' | 'CUSTOMER' | 'STAFF') {
      const email = `${randomUUID()}@example.test`; const user = await db.user.create({ data: { fullName: 'P3 test account', email, role, emailVerifiedAt: new Date(), passwordHash: await bcrypt.hash(password, 4) } }); accounts.push({ email, role });
      const result = await request(app.getHttpServer()).post('/api/auth/login').set('Origin', 'http://localhost:3000').send({ email, password }).expect(200);
      return { id: user.id, cookie: (result.headers['set-cookie'] as unknown as string[])[0].split(';')[0] };
    }
    const c = await account('CUSTOMER'); customer = c.cookie; userId = c.id; other = (await account('CUSTOMER')).cookie; admin = (await account('ADMIN')).cookie; staff = (await account('STAFF')).cookie;
    productId = (await db.product.create({ data: { name: 'P3 Browser Drink', basePrice: '35000', description: 'Only in dedicated P3 test database' } })).id;
    otherProduct = (await db.product.create({ data: { name: 'P3 Other Drink', basePrice: '20000' } })).id;
    sizeId = (await db.size.create({ data: { productId, name: 'M', extraPrice: '0', onHand: 50 } })).id;
    sizeB = (await db.size.create({ data: { productId, name: 'L', extraPrice: '5000', onHand: 50 } })).id;
    noStock = (await db.size.create({ data: { productId, name: 'Uninitialized', extraPrice: '0' } })).id;
    topping = (await db.topping.create({ data: { name: 'P3 Topping', price: '2000' } })).id;
    disabled = (await db.topping.create({ data: { name: 'P3 Disabled', price: '1000', isAvailable: false } })).id;
  });
  beforeEach(async () => { const cart = await get().expect(200); for (const row of cart.body.items) await remove(row.id).expect(200); });
  afterAll(async () => { await app?.close(); });
  it('adds exactly once for retry, rejects key reuse, and uses server prices without reserving', async () => {
    const key = randomUUID(); const body = { ...item('Ít đá'), quantity: 2, expectedVersion: (await get()).body.version, unitPrice: 1, userId: 'spoof' };
    const first = await post('/cart/items', body, key).expect(201); const again = await post('/cart/items', body, key).expect(201);
    expect(again.body.version).toBe(first.body.version); expect(again.body.items[0].quantity).toBe(2); expect(again.body.items[0].unitPrice).toBe('37000');
    expect((await post('/cart/items', { ...body, quantity: 3 }, key).expect(409)).body.code).toBe('IDEMPOTENCY_KEY_REUSED');
    const stock = await db.size.findUniqueOrThrow({ where: { id: sizeId } }); expect(stock.onHand).toBe(50); expect(stock.reserved).toBe(0);
    const stored = await db.cartItem.findUniqueOrThrow({ where: { id: first.body.items[0].id }, include: { toppings: true, cart: true } });
    expect(stored.cart.userId).toBe(userId); expect(stored.sizeId).toBe(sizeId); expect(stored.toppings[0].toppingId).toBe(topping); expect(stored.note).toBe('Ít đá');
  });
  it('detects stale versions and serializes concurrent cart edits', async () => {
    const added = await post('/cart/items', item()).expect(201); const id = added.body.items[0].id; const version = added.body.version;
    expect((await patch(id, { ...item(), quantity: 2, expectedVersion: version - 1 }).expect(409)).body.code).toBe('CART_CHANGED');
    const results = await Promise.all([patch(id, { ...item(), quantity: 2, expectedVersion: version }), patch(id, { ...item(), quantity: 3, expectedVersion: version })]);
    expect(results.map((r) => r.status).sort((a,b) => a-b)).toEqual([200,409]); expect((await get()).body.items).toHaveLength(1);
  });
  it('merges transactionally with version and stable key; retry does not add quantity again', async () => {
    const key = randomUUID(); const body = { items: [item('  Ít đá\r\nKhông đường '), { ...item('Khác'), sizeId: sizeB }], expectedVersion: (await get()).body.version };
    const first = await post('/cart/merge', body, key).expect(200); await post('/cart/merge', body, key).expect(200);
    const fresh = await get().expect(200); expect(fresh.body.items).toHaveLength(2); expect(fresh.body.items.every((i: { quantity: number }) => i.quantity === 1)).toBe(true); expect(fresh.body.version).toBe(first.body.version);
    expect((await post('/cart/merge', { ...body, expectedVersion: first.body.version - 1 }).expect(409)).body.code).toBe('CART_CHANGED');
  });
  it('rolls back the entire merge on invalid topping and never silently cuts quantity', async () => {
    const before = (await get()).body;
    await post('/cart/merge', { items: [item(), { ...item('Bad'), toppingIds: [disabled] }], expectedVersion: before.version }).expect(400);
    expect((await get()).body).toEqual(before);
    await post('/cart/items', { ...item(), quantity: 20 }).expect(201); await post('/cart/items', item()).expect(409);
    expect((await get()).body.items[0].quantity).toBe(20); await post('/cart/items', { ...item('Other'), quantity: 21 }).expect(400);
  });
  it('keeps different Size/Topping/Note separate and sums quantities of a shared SKU', async () => {
    for (const config of [item('A'), { ...item('A'), sizeId: sizeB }, { ...item('A'), toppingIds: [] }, item('a')]) await post('/cart/items', config).expect(201);
    expect((await get()).body.items).toHaveLength(4);
    const small = await db.size.create({ data: { productId, name: 'Small stock', extraPrice: '0', onHand: 20 } });
    await post('/cart/items', { ...item('One'), sizeId: small.id, quantity: 15 }).expect(201);
    const failure = await post('/cart/items', { ...item('Two'), sizeId: small.id, quantity: 10 }).expect(409); expect(failure.body.code).toBe('OUT_OF_STOCK');
    expect((await get()).body.items.filter((i: { sizeId: string }) => i.sizeId === small.id)).toHaveLength(1);
  });
  it('rejects invalid Size, disabled topping and NULL inventory without modifying stock', async () => {
    await post('/cart/items', { ...item(), productId: otherProduct }).expect(400);
    await post('/cart/items', { ...item(), toppingIds: [disabled] }).expect(400);
    expect((await post('/cart/items', { ...item(), sizeId: noStock }).expect(409)).body.code).toBe('INVENTORY_UNINITIALIZED');
    expect((await db.size.findUniqueOrThrow({ where: { id: noStock } })).onHand).toBeNull();
  });
  it('keeps legacy data untouched until the owner explicitly saves a valid configuration', async () => {
    const cart = await db.cart.upsert({ where: { userId }, create: { userId }, update: {} });
    const old = await db.cartItem.create({ data: { cartId: cart.id, productId, quantity: 2, note: 'Legacy  note' } });
    let response = (await get()).body; expect(response.canCheckout).toBe(false); expect(response.items[0].requiresConfiguration).toBe(true);
    await patch(old.id, { ...item(), sizeId: noStock }).expect(409);
    expect((await db.cartItem.findUniqueOrThrow({ where: { id: old.id } })).note).toBe(old.note);
    const key = randomUUID(); const body = { ...item('New note'), sizeId: sizeB, quantity: 3, expectedVersion: response.version };
    response = (await patch(old.id, body, key).expect(200)).body; await patch(old.id, body, key).expect(200);
    expect(response.canCheckout).toBe(true); const saved = await db.cartItem.findUniqueOrThrow({ where: { id: old.id } }); expect(saved.requiresConfiguration).toBe(false); expect(saved.quantity).toBe(3); expect(saved.sizeId).toBe(sizeB);
  });
  it('returns unavailable flags and allows deleting an invalid line even when others need adjustment', async () => {
    const bad = await db.topping.create({ data: { name: 'P3 turn off', price: '1000' } });
    const a = await post('/cart/items', { ...item('A'), toppingIds: [bad.id] }).expect(201); await post('/cart/items', { ...item('B'), toppingIds: [bad.id] }).expect(201);
    await db.topping.update({ where: { id: bad.id }, data: { isAvailable: false } });
    expect((await get()).body.items.every((i: { isValid: boolean }) => i.isValid === false)).toBe(true);
    const key = randomUUID(); const body = { expectedVersion: (await get()).body.version }; await remove(a.body.items[0].id, body, key).expect(200); await remove(a.body.items[0].id, body, key).expect(200);
    expect((await get()).body.items).toHaveLength(1);
  });
  it('enforces CUSTOMER ownership and rejects ADMIN/STAFF cart access', async () => {
    const added = await post('/cart/items', item()).expect(201); const id = added.body.items[0].id;
    await patch(id, item(), randomUUID(), other).expect(404); await remove(id, {}, randomUUID(), other).expect(404); expect((await get(other)).body.items).toEqual([]);
    await get(admin).expect(403); await get(staff).expect(403); expect((await get()).body.items[0].id).toBe(id);
  });
  it('quote and Order boundary recheck availability without creating Order or reservation', async () => {
    const sku = await db.size.create({ data: { productId, name: 'Changed stock', extraPrice: '0', onHand: 2 } });
    const chosen = { ...item(), sizeId: sku.id }; const added = await post('/cart/items', chosen).expect(201);
    await post('/cart/calculate', { items: [chosen], unitPrice: 1 }).expect(200);
    await db.size.update({ where: { id: sku.id }, data: { onHand: 0 } });
    await post('/cart/calculate', { items: [chosen] }).expect(409);
    await post('/orders', { cartVersion: added.body.version, quoteFingerprint: 'old' }).expect(409);
    expect(await db.order.count()).toBe(0); expect(await db.orderReservation.count()).toBe(0);
  });
  (process.env.P3_BROWSER === '1' ? it : it.skip)('real Next UI guest merge/reload/edit/delete and ADMIN stock on desktop/mobile', async () => {
    await app.listen(0);
    const address = app.getHttpServer().address() as { port: number };
    const settings = { api: `http://localhost:${address.port}`, database: decodeURIComponent(new URL(process.env.P3_TEST_DATABASE_URL!).pathname.slice(1)), productId, password, customer: accounts[0].email, admin: accounts.find((a) => a.role === 'ADMIN')!.email };
    await new Promise<void>((resolve, reject) => {
      const child = spawn(process.execPath, [path.resolve('../../tests/p3-browser.cjs')], { env: { ...process.env, P3_BROWSER_SETTINGS: JSON.stringify(settings) }, windowsHide: true });
      child.stdout.on('data', (data: Buffer) => process.stdout.write(data)); child.stderr.on('data', (data: Buffer) => process.stderr.write(data)); child.on('error', reject); child.on('exit', (code) => code === 0 ? resolve() : reject(new Error('Real browser flow failed')));
    });
    expect((await db.cartItem.count({ where: { cart: { userId } } }))).toBe(0);
    const edits = await db.idempotencyRecord.findMany({ where: { actorId: userId, operation: 'cart.edit' } });
    expect(edits.some((r) => JSON.stringify(r.result).includes('P3 edited'))).toBe(true);
    const stock = await db.size.findUniqueOrThrow({ where: { id: sizeId } }); expect(stock.onHand).toBe(55); expect(stock.reserved).toBe(0);
    expect((await db.size.findUniqueOrThrow({ where: { id: noStock } })).onHand).toBeNull();
    expect(await db.idempotencyRecord.count({ where: { operation: 'admin.inventory.change', requestHash: sizeId } })).toBeGreaterThan(0);
  }, 150000);
});
