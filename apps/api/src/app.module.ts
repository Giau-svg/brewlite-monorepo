import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { ToppingsModule } from './toppings/toppings.module';
import { CartModule } from './cart/cart.module';

@Module({
  imports: [PrismaModule, ProductsModule, ToppingsModule, CartModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}

