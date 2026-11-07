
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Cho phép Frontend (Next.js :3000) gọi API
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  });

  // Tự động validate DTO đầu vào
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Prefix toàn bộ route bằng /api (ví dụ: /api/products, /api/orders)
  app.setGlobalPrefix('api');

  // Swagger API Documentation phục vụ tích hợp Frontend
  const config = new DocumentBuilder()
    .setTitle('BrewLite API - Software Engineering')
    .setDescription('Tài liệu API phục vụ tích hợp Frontend Next.js và kiểm thử hệ thống')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`🚀 BrewLite API đang chạy tại: http://localhost:${port}/api`);
  console.log(`📑 Swagger API Docs: http://localhost:${port}/api/docs`);
}

void bootstrap();
