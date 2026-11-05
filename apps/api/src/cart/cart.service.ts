import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddToCartDto, CalculateQuoteDto } from './dto/cart.dto';
import { DiscountType } from '@prisma/client';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tính toán tổng tiền giỏ hàng (Pricing Service / Quote Engine)
   * Tính theo đơn giá gốc + phụ thu size + topping - mã giảm giá - điểm tích lũy
   */
  async calculateQuote(dto: CalculateQuoteDto) {
    if (!dto.items || dto.items.length === 0) {
      return {
        items: [],
        subtotal: 0,
        discountAmount: 0,
        pointsDiscount: 0,
        finalTotal: 0,
        couponCode: null,
      };
    }

    const calculatedItems = [];
    let subtotal = 0;

    for (const item of dto.items) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
        include: { sizes: true },
      });

      if (!product || !product.isAvailable) {
        throw new NotFoundException(`Sản phẩm với ID ${item.productId} không khả dụng.`);
      }

      const basePrice = Number(product.basePrice);
      let sizeExtra = 0;
      let sizeName = 'Mặc định';

      if (item.sizeId) {
        const size = product.sizes.find((s) => s.id === item.sizeId);
        if (size) {
          sizeExtra = Number(size.extraPrice);
          sizeName = size.name;
        }
      }

      let toppingsTotal = 0;
      const selectedToppings: { name: string; price: number }[] = [];

      if (item.toppingIds && item.toppingIds.length > 0) {
        const toppings = await this.prisma.topping.findMany({
          where: { id: { in: item.toppingIds }, isAvailable: true },
        });

        for (const top of toppings) {
          const topPrice = Number(top.price);
          toppingsTotal += topPrice;
          selectedToppings.push({ name: top.name, price: topPrice });
        }
      }

      const unitPrice = basePrice + sizeExtra + toppingsTotal;
      const lineTotal = unitPrice * item.quantity;
      subtotal += lineTotal;

      calculatedItems.push({
        productId: product.id,
        productName: product.name,
        sizeName,
        unitPrice,
        quantity: item.quantity,
        toppings: selectedToppings,
        lineTotal,
        note: item.note ?? '',
      });
    }

    // 2. Tính giảm giá Voucher/Coupon
    let discountAmount = 0;
    let appliedCoupon: any = null;

    if (dto.couponCode) {
      const now = new Date();
      const promo = await this.prisma.promotion.findUnique({
        where: { code: dto.couponCode.toUpperCase() },
      });

      if (!promo || !promo.isActive) {
        throw new BadRequestException(`Mã giảm giá "${dto.couponCode}" không tồn tại hoặc đã hết hạn.`);
      }

      if (now < promo.startDate || now > promo.endDate) {
        throw new BadRequestException(`Mã giảm giá "${dto.couponCode}" chưa đến đợt hoặc đã hết hạn.`);
      }

      if (promo.usedCount >= promo.usageLimit) {
        throw new BadRequestException(`Mã giảm giá "${dto.couponCode}" đã đạt giới hạn lượt dùng.`);
      }

      const minOrder = Number(promo.minOrderValue ?? 0);
      if (subtotal < minOrder) {
        throw new BadRequestException(
          `Đơn hàng chưa đạt giá trị tối thiểu ${minOrder.toLocaleString('vi-VN')}đ để dùng mã "${dto.couponCode}".`,
        );
      }

      const val = Number(promo.discountValue);
      if (promo.discountType === DiscountType.PERCENTAGE) {
        discountAmount = (subtotal * val) / 100;
        const maxD = Number(promo.maxDiscount ?? 0);
        if (maxD > 0 && discountAmount > maxD) {
          discountAmount = maxD;
        }
      } else {
        discountAmount = val;
      }

      discountAmount = Math.min(discountAmount, subtotal);
      appliedCoupon = {
        code: promo.code,
        discountType: promo.discountType,
        discountValue: val,
      };
    }

    // 3. Tính điểm tích lũy thưởng (1 điểm = 1.000 VNĐ)
    let pointsDiscount = 0;
    const pointsUsed = dto.pointsUsed ?? 0;

    if (pointsUsed > 0 && dto.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: dto.userId },
      });

      if (!user || user.loyaltyPoints < pointsUsed) {
        throw new BadRequestException('Bạn không đủ điểm thưởng khả dụng.');
      }

      pointsDiscount = pointsUsed * 1000;
      const maxAllowedPointsDiscount = Math.max(0, subtotal - discountAmount);
      pointsDiscount = Math.min(pointsDiscount, maxAllowedPointsDiscount);
    }

    const finalTotal = Math.max(0, subtotal - discountAmount - pointsDiscount);

    return {
      items: calculatedItems,
      subtotal,
      discountAmount,
      pointsUsed,
      pointsDiscount,
      finalTotal,
      appliedCoupon,
    };
  }

  /**
   * Lấy giỏ hàng theo User hoặc Guest Session
   */
  async getCart(userId?: string, sessionId?: string) {
    if (!userId && !sessionId) {
      throw new BadRequestException('Cần cung cấp userId hoặc sessionId để xem giỏ hàng.');
    }

    const cart = await this.prisma.cart.findFirst({
      where: userId ? { userId } : { sessionId },
      include: {
        items: {
          include: {
            product: {
              include: { sizes: true },
            },
          },
        },
      },
    });

    if (!cart) {
      return { id: null, items: [] };
    }

    return cart;
  }

  /**
   * Thêm món vào giỏ hàng
   */
  async addToCart(dto: AddToCartDto) {
    let cart = await this.prisma.cart.findFirst({
      where: dto.userId ? { userId: dto.userId } : { sessionId: dto.sessionId },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: {
          userId: dto.userId ?? null,
          sessionId: dto.sessionId ?? 'guest_session',
        },
      });
    }

    const item = await this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: dto.productId,
        quantity: dto.quantity,
        note: dto.note ?? '',
      },
      include: {
        product: true,
      },
    });

    return item;
  }

  /**
   * Xóa một món khỏi giỏ hàng
   */
  async removeItem(itemId: string) {
    return this.prisma.cartItem.delete({
      where: { id: itemId },
    });
  }

  /**
   * Xóa toàn bộ giỏ hàng
   */
  async clearCart(cartId: string) {
    return this.prisma.cartItem.deleteMany({
      where: { cartId },
    });
  }
}
