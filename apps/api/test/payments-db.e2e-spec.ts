import { MockPaymentService } from '../src/payments/mock-payment.service';
import { randomUUID } from 'node:crypto';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { PaymentsService } from '../src/payments/payments.service';

describe('Thanh toán với PostgreSQL thật', () => {
  let db: PrismaService;
  let service: PaymentsService;
  let userId: string;
  let orderId: string;

  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL ?? '');

    // Chỉ cho chạy trên database kiểm thử ở máy local.
    if (
      url.pathname !== '/brewlite_payment_test' ||
      !['127.0.0.1', 'localhost'].includes(url.hostname)
    ) {
      throw new Error('Dừng: cần dùng database local brewlite_payment_test.');
    }

    db = new PrismaService();
    await db.$connect();
    service = new PaymentsService(db, new MockPaymentService());
  });

  beforeEach(async () => {
    userId = randomUUID();
    orderId = randomUUID();

    await db.user.create({
      data: {
        id: userId,
        fullName: 'Khách kiểm thử',
        email: `${userId}@example.test`,
        passwordHash: 'test-only-not-for-login',
      },
    });

    await db.order.create({
      data: {
        id: orderId,
        userId,
        orderCode: `TEST-${randomUUID()}`,
        subtotal: '45000',
        finalTotal: '45000',
        status: OrderStatus.PENDING_PAYMENT,
      },
    });
  });

  afterEach(async () => {
    if (!db || !userId || !orderId) return;

    // Chỉ xóa dữ liệu có ID do bài kiểm thử này tạo.
    await db.notification.deleteMany({ where: { userId } });
    await db.payment.deleteMany({ where: { orderId } });
    await db.order.deleteMany({ where: { id: orderId } });
    await db.user.deleteMany({ where: { id: userId } });
  });

  afterAll(async () => {
    if (db) await db.$disconnect();
  });

  it.each([PaymentMethod.WALLET, PaymentMethod.CARD])(
    'Thanh toán bằng %s và xác nhận đơn',
    async (method) => {
      const payment = await service.mockPay(
        {
          orderId,
          method,
          idempotencyKey: randomUUID(),
        },
        userId,
      );

      expect(payment.status).toBe(PaymentStatus.SUCCESS);
      expect(payment.amount.toString()).toBe('45000');
      expect(payment.method).toBe(method);

      const order = await db.order.findUniqueOrThrow({
        where: { id: orderId },
      });

      expect(order.status).toBe(OrderStatus.PAID);
      expect(await db.payment.count({ where: { orderId } })).toBe(1);
      expect(await db.notification.count({ where: { userId } })).toBe(1);
    },
  );

  it('Gửi lại cùng mã thì trả cùng giao dịch', async () => {
    const request = {
      orderId,
      method: PaymentMethod.WALLET,
      idempotencyKey: randomUUID(),
    };

    const first = await service.mockPay(request, userId);
    const second = await service.mockPay(request, userId);

    expect(second.id).toBe(first.id);
    expect(await db.payment.count({ where: { orderId } })).toBe(1);
    expect(await db.notification.count({ where: { userId } })).toBe(1);
  });

  it('Hai yêu cầu đồng thời cùng mã chỉ tạo một giao dịch', async () => {
    const request = {
      orderId,
      method: PaymentMethod.CARD,
      idempotencyKey: randomUUID(),
    };

    // Chờ cả hai kết thúc trước khi dọn dữ liệu.
    const results = await Promise.allSettled([
      service.mockPay(request, userId),
      service.mockPay(request, userId),
    ]);

    const ids = results.map((result) => {
      if (result.status === 'rejected') throw result.reason;
      return result.value.id;
    });

    expect(ids[0]).toBe(ids[1]);
    expect(await db.payment.count({ where: { orderId } })).toBe(1);
    expect(await db.notification.count({ where: { userId } })).toBe(1);
  });
  it('Thanh toán thất bại giữ đơn chờ và cho phép thử lại', async () => {
    const gateway = new MockPaymentService();
    const paymentService = new PaymentsService(db, gateway);

    const paySpy = jest.spyOn(gateway, 'pay').mockReturnValue({
      success: false,
      failureReason: 'Thẻ bị từ chối trong kiểm thử.',
    });

    try {
      const request = {
        orderId,
        method: PaymentMethod.CARD,
        idempotencyKey: randomUUID(),
      };

      // Lần đầu: cổng giả lập từ chối thanh toán.
      const failed = await paymentService.mockPay(request, userId);

      expect(failed.status).toBe(PaymentStatus.FAILED);
      expect(failed.failureReason).toBe('Thẻ bị từ chối trong kiểm thử.');
      expect(failed.paidAt).toBeNull();

      const pendingOrder = await db.order.findUniqueOrThrow({
        where: { id: orderId },
      });

      expect(pendingOrder.status).toBe(OrderStatus.PENDING_PAYMENT);
      expect(await db.notification.count({ where: { userId } })).toBe(0);

      // Gửi lại cùng mã: nhận kết quả thất bại cũ.
      const repeated = await paymentService.mockPay(request, userId);

      expect(repeated.id).toBe(failed.id);
      expect(paySpy).toHaveBeenCalledTimes(1);
      expect(await db.payment.count({ where: { orderId } })).toBe(1);

      // Lần thanh toán mới: dùng mã mới và giả lập thành công.
      paySpy.mockReturnValue({
        success: true,
        transactionRef: `MOCK-${randomUUID()}`,
      });

      const succeeded = await paymentService.mockPay(
        {
          ...request,
          idempotencyKey: randomUUID(),
        },
        userId,
      );

      expect(succeeded.status).toBe(PaymentStatus.SUCCESS);
      expect(succeeded.id).not.toBe(failed.id);

      const paidOrder = await db.order.findUniqueOrThrow({
        where: { id: orderId },
      });

      expect(paidOrder.status).toBe(OrderStatus.PAID);
      expect(await db.payment.count({ where: { orderId } })).toBe(2);
      expect(await db.notification.count({ where: { userId } })).toBe(1);
    } finally {
      paySpy.mockRestore();
    }
  });
});
