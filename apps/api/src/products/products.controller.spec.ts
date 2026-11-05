import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { NotFoundException } from '@nestjs/common';

describe('ProductsController', () => {
  let controller: ProductsController;

  const mockProduct = {
    id: 'prod-uuid-1',
    name: 'Cà phê sữa đá BrewLite',
    description: 'Robusta + Arabica thơm đậm vị',
    basePrice: 29000 as any,
    imageUrl: 'https://example.com/cf.jpg',
    categoryId: 'cat-uuid-1',
    stockQuantity: 100,
    isAvailable: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    category: { id: 'cat-uuid-1', name: 'Cà phê' },
    sizes: [{ id: 'size-1', productId: 'prod-uuid-1', name: 'Size M', extraPrice: 0 as any }],
  };

  const mockProductsService = {
    findAll: jest.fn().mockResolvedValue([mockProduct]),
    findOne: jest.fn().mockImplementation((id: string) => {
      if (id === mockProduct.id) {
        return Promise.resolve(mockProduct);
      }
      return Promise.reject(new NotFoundException(`Sản phẩm với ID ${id} không tồn tại.`));
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getProducts', () => {
    it('returns a list of products', async () => {
      const result = await controller.getProducts();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Cà phê sữa đá BrewLite');
      expect(mockProductsService.findAll).toHaveBeenCalled();
    });
  });

  describe('getProductById', () => {
    it('returns a product when given a valid ID', async () => {
      const result = await controller.getProductById('prod-uuid-1');
      expect(result).toBeDefined();
      expect(result.id).toBe('prod-uuid-1');
      expect(mockProductsService.findOne).toHaveBeenCalledWith('prod-uuid-1');
    });

    it('throws NotFoundException when product is not found', async () => {
      await expect(controller.getProductById('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });
});
