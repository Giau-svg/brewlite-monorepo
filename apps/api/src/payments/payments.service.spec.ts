import { MockPaymentService } from './mock-payment.service';
import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { OrderStatus, PaymentMethod, Prisma } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PaymentsService', () => {
  let service: PaymentsService;

  const database = {
    order: {
      findFirst: jest.fn(),
    },
    payment: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        PaymentsService,
        MockPaymentService,
        {
          provide: PrismaService,
          useValue: database,
        },
      ],
    }).compile();

    service = module.get(PaymentsService);
  });

  it('Chấp nhận đơn đang chờ thanh toán của đúng khách', async () => {
    const order = {
      id: 'order-1',
      userId: 'customer-1',
      status: OrderStatus.PENDING_PAYMENT,
      finalTotal: new Prisma.Decimal('45000'),
    };

    database.order.findFirst.mockResolvedValue(order);

    const result = await service.getPayableOrder('order-1', 'customer-1');

    expect(result.finalTotal.toString()).toBe('45000');
    expect(database.order.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'order-1',
        userId: 'customer-1',
      },
    });
  });

  it('Từ chối khi không tìm thấy đơn thuộc khách', async () => {
    database.order.findFirst.mockResolvedValue(null);

    await expect(
      service.getPayableOrder('order-1', 'customer-2'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('Từ chối thanh toán mới cho đơn đã trả tiền', async () => {
    database.order.findFirst.mockResolvedValue({
      id: 'order-1',
      status: OrderStatus.PAID,
      finalTotal: new Prisma.Decimal('45000'),
    });

    await expect(
      service.getPayableOrder('order-1', 'customer-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('Từ chối dùng lại mã thanh toán cho đơn khác', async () => {
    database.payment.findUnique.mockResolvedValue({
      id: 'payment-1',
      orderId: 'order-1',
      method: PaymentMethod.WALLET,
      order: {
        userId: 'customer-1',
      },
    });

    await expect(
      service.getExistingPayment(
        {
          orderId: 'order-2',
          method: PaymentMethod.WALLET,
          idempotencyKey: 'request-1',
        },
        'customer-1',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('Không bắt đầu thanh toán khi thiếu người đăng nhập', async () => {
    await expect(
      service.mockPay(
        {
          orderId: 'order-1',
          method: PaymentMethod.CARD,
          idempotencyKey: 'request-1',
        },
        '',
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(database.$transaction).not.toHaveBeenCalled();
  });
});
