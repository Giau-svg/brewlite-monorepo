import { Test, TestingModule } from '@nestjs/testing';
import { CartService } from './cart.service';
import { PrismaService } from '../prisma/prisma.service';
import { DiscountType } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('CartService - Unit Test (Nghiệp vụ tính giá & giỏ hàng)', () => {
  let service: CartService;

  const mockProduct = {
    id: 'prod-coffee-1',
    name: 'Cà phê sữa đá BrewLite',
    basePrice: 29000 as any,
    isAvailable: true,
    sizes: [
      { id: 'size-m', name: 'Size M', extraPrice: 6000 as any },
      { id: 'size-l', name: 'Size L', extraPrice: 10000 as any },
    ],
  };

  const mockToppings = [
    { id: 'top-pearl', name: 'Trân châu trắng', price: 6000 as any, isAvailable: true },
    { id: 'top-cheese', name: 'Kem cheese', price: 10000 as any, isAvailable: true },
  ];

  const mockPromotionPercent = {
    code: 'WELCOME10',
    discountType: DiscountType.PERCENTAGE,
    discountValue: 10 as any,
    maxDiscount: 20000 as any,
    minOrderValue: 40000 as any,
    startDate: new Date('2020-01-01'),
    endDate: new Date('2030-12-31'),
    usageLimit: 100,
    usedCount: 0,
    isActive: true,
  };

  const mockPrismaService = {
    product: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id === mockProduct.id) return Promise.resolve(mockProduct);
        return Promise.resolve(null);
      }),
    },
    topping: {
      findMany: jest.fn().mockImplementation(({ where }) => {
        const ids = where.id?.in ?? [];
        return Promise.resolve(mockToppings.filter((t) => ids.includes(t.id)));
      }),
    },
    promotion: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.code === 'WELCOME10') return Promise.resolve(mockPromotionPercent);
        return Promise.resolve(null);
      }),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({ id: 'user-1', loyaltyPoints: 50 }),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  it('nên được khởi tạo thành công', () => {
    expect(service).toBeDefined();
  });

  describe('calculateQuote - Tính toán giá trị giỏ hàng', () => {
    it('trả về 0 khi giỏ hàng rỗng', async () => {
      const result = await service.calculateQuote({ items: [] });
      expect(result.subtotal).toBe(0);
      expect(result.finalTotal).toBe(0);
    });

    it('tính chính xác giá gốc + phụ thu size + topping cho từng món', async () => {
      // 1 ly size M (29k + 6k = 35k) + trân châu trắng (6k) = 41k x 2 ly = 82k
      const result = await service.calculateQuote({
        items: [
          {
            productId: 'prod-coffee-1',
            sizeId: 'size-m',
            toppingIds: ['top-pearl'],
            quantity: 2,
          },
        ],
      });

      expect(result.subtotal).toBe(82000);
      expect(result.discountAmount).toBe(0);
      expect(result.finalTotal).toBe(82000);
      expect(result.items[0].unitPrice).toBe(41000);
      expect(result.items[0].lineTotal).toBe(82000);
    });

    it('áp dụng thành công mã giảm giá phần trăm (%) khi đủ giá trị đơn tối thiểu', async () => {
      // Đơn 82k > 40k minOrderValue, giảm 10% = 8.200đ -> finalTotal = 73.800đ
      const result = await service.calculateQuote({
        items: [
          {
            productId: 'prod-coffee-1',
            sizeId: 'size-m',
            toppingIds: ['top-pearl'],
            quantity: 2,
          },
        ],
        couponCode: 'WELCOME10',
      });

      expect(result.subtotal).toBe(82000);
      expect(result.discountAmount).toBe(8200);
      expect(result.finalTotal).toBe(73800);
      expect(result.appliedCoupon?.code).toBe('WELCOME10');
    });

    it('ném lỗi NotFoundException nếu sản phẩm không tồn tại', async () => {
      await expect(
        service.calculateQuote({
          items: [{ productId: 'invalid-id', quantity: 1 }],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('ném lỗi BadRequestException nếu mã giảm giá không tồn tại', async () => {
      await expect(
        service.calculateQuote({
          items: [{ productId: 'prod-coffee-1', quantity: 1 }],
          couponCode: 'VOUCHER_KHONG_TON_TAI',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
