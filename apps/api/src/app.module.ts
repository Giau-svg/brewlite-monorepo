import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { ToppingsModule } from './toppings/toppings.module';
import { CartModule } from './cart/cart.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [PrismaModule, ProductsModule, ToppingsModule, CartModule, PaymentsModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}

