import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';

describe('ProductsController', () => {
  let controller: ProductsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('returns a catalog with unique IDs and non-negative integer VND prices', () => {
    const products = controller.getProducts();
    expect(products.length).toBeGreaterThan(0);
    expect(new Set(products.map((product) => product.id)).size).toBe(products.length);
    for (const product of products) {
      expect(product.name.trim().length).toBeGreaterThan(0);
      expect(Number.isInteger(product.price)).toBe(true);
      expect(product.price).toBeGreaterThanOrEqual(0);
      expect(product.image.length).toBeGreaterThan(0);
    }
  });
});
