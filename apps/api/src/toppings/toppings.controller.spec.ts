import { Test, TestingModule } from '@nestjs/testing';
import { ToppingsController } from './toppings.controller';
import { ToppingsService } from './toppings.service';

describe('ToppingsController', () => {
  let controller: ToppingsController;

  const mockToppings = [
    { id: 'top-1', name: 'Trân châu đen', price: 5000 as any, isAvailable: true },
    { id: 'top-2', name: 'Thạch nha đam', price: 7000 as any, isAvailable: true },
  ];

  const mockToppingsService = {
    findAll: jest.fn().mockResolvedValue(mockToppings),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ToppingsController],
      providers: [
        {
          provide: ToppingsService,
          useValue: mockToppingsService,
        },
      ],
    }).compile();

    controller = module.get<ToppingsController>(ToppingsController);
  });

  it('nên được khởi tạo', () => {
    expect(controller).toBeDefined();
  });

  it('lấy danh sách toppings khả dụng', async () => {
    const result = await controller.getToppings();
    expect(result).toHaveLength(2);
    expect(mockToppingsService.findAll).toHaveBeenCalled();
  });
});
