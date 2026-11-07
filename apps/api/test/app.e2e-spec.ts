import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const testUrl = process.env.AUTH_TEST_DATABASE_URL;
    if (!testUrl || !new URL(testUrl).searchParams.get('schema')?.startsWith('brewlite_auth_test_')) throw new Error('Use npm run test:e2e with its isolated schema runner.');
    process.env.DATABASE_URL = testUrl;
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api');
    await app.init();
  });

  it('/api/health (GET) - returns status ok', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('ok');
        expect(res.body.service).toBe('BrewLite API');
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
