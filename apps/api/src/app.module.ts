import { AuthModule } from './auth/auth.module';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { ToppingsModule } from './toppings/toppings.module';
import { CommerceModule } from './commerce/commerce.module';

@Module({
  imports: [AuthModule, PrismaModule, ProductsModule, ToppingsModule, CommerceModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}

