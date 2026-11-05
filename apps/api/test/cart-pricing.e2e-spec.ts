import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Integration Test - Cart & Pricing Calculation (Task 5.2)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api');
    await app.init();
  });

  it('/api/toppings (GET) - Lấy danh sách Topping thành công', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/toppings')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0]).toHaveProperty('name');
    expect(res.body[0]).toHaveProperty('price');
  });

  it('/api/cart/calculate (POST) - Tính toán báo giá giỏ hàng hợp lệ', async () => {
    // 1. Lấy 1 sản phẩm có trong DB
    const prodRes = await request(app.getHttpServer())
      .get('/api/products')
      .expect(200);

    const firstProduct = prodRes.body[0];
    const sizeId = firstProduct.sizes?.[0]?.id;

    // 2. Gửi request tính giá
    const quoteRes = await request(app.getHttpServer())
      .post('/api/cart/calculate')
      .send({
        items: [
          {
            productId: firstProduct.id,
            sizeId,
            quantity: 2,
          },
        ],
        couponCode: 'WELCOME10',
      })
      .expect(200);

    expect(quoteRes.body).toHaveProperty('subtotal');
    expect(quoteRes.body).toHaveProperty('finalTotal');
    expect(quoteRes.body).toHaveProperty('discountAmount');
    expect(quoteRes.body.subtotal).toBeGreaterThan(0);
    expect(quoteRes.body.finalTotal).toBeLessThanOrEqual(quoteRes.body.subtotal);
  });

  afterEach(async () => {
    await app.close();
  });
});
