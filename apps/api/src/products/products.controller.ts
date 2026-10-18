
import { Controller, Get } from '@nestjs/common';

@Controller('products')
export class ProductsController {
  @Get()
  getProducts() {
    return [
      {
        id: 1,
        name: 'Cà phê sữa',
        price: 29000,
        image: '☕',
      },
      {
        id: 2,
        name: 'Latte',
        price: 39000,
        image: '🥛',
      },
      {
        id: 3,
        name: 'Trà đào',
        price: 35000,
        image: '🍑',
      },
    ];
  }
}
