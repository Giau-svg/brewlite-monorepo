import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  NotificationType,
  OrderStatus,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { MockPaymentService } from './mock-payment.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mockPayment: MockPaymentService,
  ) {}

  async getPayableOrder(
    orderId: string,
    userId: string,
    db: Prisma.TransactionClient = this.prisma,
  ) {
    const order = await db.order.findFirst({
      where: { id: orderId, userId },
    });

    if (!order) {
      throw new NotFoundException(
        'Không tìm thấy đơn hàng thuộc tài khoản của bạn.',
      );
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException(
        'Đơn hàng không ở trạng thái chờ thanh toán.',
      );
    }

    if (order.finalTotal.lessThan(0)) {
      throw new BadRequestException('Số tiền của đơn hàng không hợp lệ.');
    }

    return order;
  }

  async getExistingPayment(
    dto: CreatePaymentDto,
    userId: string,
    db: Prisma.TransactionClient = this.prisma,
  ) {
    const payment = await db.payment.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
      include: {
        order: {
          select: { userId: true },
        },
      },
    });

    if (!payment) return null;

    const { order, ...result } = payment;

    if (
      order.userId !== userId ||
      payment.orderId !== dto.orderId ||
      payment.method !== dto.method
    ) {
      throw new ConflictException(
        'Mã yêu cầu thanh toán đã được sử dụng cho yêu cầu khác.',
      );
    }

    return result;
  }

  async mockPay(dto: CreatePaymentDto, userId: string) {
    if (!userId) {
      throw new UnauthorizedException('Bạn cần đăng nhập để thanh toán.');
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            const existing = await this.getExistingPayment(dto, userId, tx);

            if (existing) return existing;

            const order = await this.getPayableOrder(dto.orderId, userId, tx);

            // Cổng giả lập trả về thành công hoặc thất bại.
            const result = this.mockPayment.pay();

            // Thất bại: lưu giao dịch, giữ nguyên đơn chờ thanh toán.
            if (!result.success) {
              return await tx.payment.create({
                data: {
                  orderId: order.id,
                  amount: order.finalTotal,
                  method: dto.method,
                  status: PaymentStatus.FAILED,
                  idempotencyKey: dto.idempotencyKey,
                  failureReason: result.failureReason,
                },
              });
            }

            // Thành công: chuyển đơn sang PAID.
            const updated = await tx.order.updateMany({
              where: {
                id: order.id,
                userId,
                status: OrderStatus.PENDING_PAYMENT,
              },
              data: {
                status: OrderStatus.PAID,
              },
            });

            if (updated.count !== 1) {
              throw new ConflictException(
                'Đơn hàng đã thay đổi. Vui lòng kiểm tra lại.',
              );
            }

            const payment = await tx.payment.create({
              data: {
                orderId: order.id,
                amount: order.finalTotal,
                method: dto.method,
                status: PaymentStatus.SUCCESS,
                idempotencyKey: dto.idempotencyKey,
                transactionRef: result.transactionRef,
                paidAt: new Date(),
              },
            });

            await tx.notification.create({
              data: {
                userId,
                type: NotificationType.PAYMENT_SUCCESS,
                title: 'Thanh toán thành công',
                content:
                  `Đơn ${order.orderCode} đã được thanh toán ` +
                  'thành công bằng hình thức mô phỏng.',
              },
            });

            return payment;
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          },
        );
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.code === 'P2034' || error.code === 'P2002')
        ) {
          continue;
        }

        throw error;
      }
    }

    throw new ConflictException(
      'Có yêu cầu thanh toán đồng thời. ' +
        'Vui lòng thử lại với cùng idempotencyKey.',
    );
  }
}
