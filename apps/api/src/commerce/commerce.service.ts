import { InventoryService } from '../inventory/inventory.service';
import {
  configurationKey,
  normalizeCartNote,
} from '../inventory/cart-configuration';
import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  UnprocessableEntityException,
  HttpException,
} from '@nestjs/common';
import { Prisma, OrderStatus, PaymentStatus } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

type Tx = Prisma.TransactionClient;
type Input = {
  productId: string;
  sizeId: string;
  toppingIds: string[];
  quantity: number;
  note: string;
};
const D = Prisma.Decimal;
const orderInclude = {
  items: { include: { toppings: true } },
  payments: true,
  history: { orderBy: { orderVersion: 'asc' as const } },
};
function fail(code: string, message: string, status = 400): never {
  const body = { code, message };
  if (status === 409) throw new ConflictException(body);
  if (status === 422) throw new UnprocessableEntityException(body);
  if (status === 404) throw new NotFoundException(body);
  throw new BadRequestException(body);
}
export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    fail('INVALID_INPUT', 'Dữ liệu không hợp lệ.');
  return value as Record<string, unknown>;
}
export function integer(value: unknown, min = 0, max = 2147483647) {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < min ||
    value > max
  )
    fail('INVALID_INPUT', 'Số nguyên không hợp lệ.');
  return value;
}
export function text(value: unknown, max = 200) {
  if (typeof value !== 'string' || value.length > max)
    fail('INVALID_INPUT', 'Chuỗi không hợp lệ.');
  return value.trim();
}
export function money(value: unknown) {
  const s = text(value, 12);
  if (!/^(0|[1-9][0-9]*)$/.test(s) || new D(s).gt('99999999'))
    fail('INVALID_PRICE', 'Giá phải là số đồng nguyên không âm.');
  return new D(s);
}
export function input(value: unknown): Input {
  const o = record(value);
  const productId = text(o.productId, 80);
  const sizeId = text(o.sizeId, 80);
  if (!/^[\da-f-]{36}$/i.test(productId) || !/^[\da-f-]{36}$/i.test(sizeId))
    fail('INVALID_OPTIONS', 'Vui lòng chọn sản phẩm và size.');
  const ids = o.toppingIds ?? [];
  if (
    !Array.isArray(ids) ||
    ids.length > 30 ||
    ids.some((id) => typeof id !== 'string') ||
    new Set(ids).size !== ids.length
  )
    fail('INVALID_OPTIONS', 'Topping không hợp lệ.');
  return {
    productId,
    sizeId,
    toppingIds: (ids as string[]).slice().sort(),
    quantity: integer(o.quantity, 1, 20),
    note: normalizeCartNote(text(o.note ?? '')),
  };
}
const configKey = configurationKey;
function hash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

@Injectable()
export class CommerceService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  constructor(
    private readonly db: PrismaService,
    private readonly inventory: InventoryService,
  ) {}
  onModuleInit() {
    this.timer = setInterval(() => {
      void this.reconcile().catch(() => {
        /* retry next sweep; no false payment result */
      });
    }, 15000);
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  async tx<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.db.$transaction(fn, {
          isolationLevel: 'Serializable',
          maxWait: 10000,
          timeout: 20000,
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          ['P2034', 'P2002'].includes(error.code) &&
          attempt < 4
        )
          continue;
        throw error;
      }
    }
  }
  async idem(
    actorId: string,
    operation: string,
    key: string | undefined,
    payload: unknown,
    fn: (tx: Tx) => Promise<unknown>,
  ) {
    if (!key || key.length < 8 || key.length > 150)
      fail('IDEMPOTENCY_REQUIRED', 'Thiếu khóa yêu cầu hợp lệ.');
    const requestHash = hash(payload);
    return this.tx(async (tx) => {
      const old = await tx.idempotencyRecord.findUnique({
        where: { actorId_operation_key: { actorId, operation, key } },
      });
      if (old) {
        if (old.requestHash !== requestHash)
          fail('IDEMPOTENCY_KEY_REUSED', 'Khóa đã dùng với dữ liệu khác.', 409);
        if (old.processingStatus !== 'SUCCEEDED')
          fail(
            'IDEMPOTENCY_PENDING',
            'Yêu cầu trước chưa có kết quả hoàn tất.',
            409,
          );
        return old.result;
      }
      const result = json(await fn(tx));
      await tx.idempotencyRecord.create({
        data: {
          actorId,
          operation,
          key,
          requestHash,
          result,
          expiresAt: new Date(Date.now() + 86400000),
        },
      });
      return result;
    });
  }
  private async price(
    tx: Tx,
    userId: string,
    inputs: Input[],
    couponCode = '',
    pointsUsed = 0,
    excludeHeldPoints = 0,
  ) {
    if (!inputs.length || inputs.length > 50)
      fail('EMPTY_CART', 'Giỏ hàng rỗng hoặc quá nhiều dòng.');
    const amounts = new Map<string, number>();
    let subtotal = new D(0);
    const lines = [];
    for (const i of inputs) {
      const { product, size, toppings } =
        await this.inventory.validateSellableConfiguration(i, tx);
      amounts.set(size.id, (amounts.get(size.id) ?? 0) + i.quantity);
      if ((amounts.get(size.id) ?? 0) > size.availableQuantity!)
        fail(
          'OUT_OF_STOCK',
          'Các cấu hình cùng Size vượt quá tồn khả dụng.',
          409,
        );
      const unitPrice = product.basePrice
        .plus(size.extraPrice)
        .plus(toppings.reduce((sum, t) => sum.plus(t.price), new D(0)));
      const lineTotal = unitPrice.times(i.quantity);
      if (!unitPrice.isInteger())
        fail('INVALID_PRICE', 'Catalog có giá lẻ chưa được xử lý.');
      subtotal = subtotal.plus(lineTotal);
      lines.push({
        productId: product.id,
        sizeId: size.id,
        productName: product.name,
        sizeName: size.name,
        unitPrice: unitPrice.toFixed(0),
        quantity: i.quantity,
        lineTotal: lineTotal.toFixed(0),
        note: i.note,
        imageUrl: product.imageUrl,
        toppings: toppings.map((t) => ({
          id: t.id,
          name: t.name,
          price: t.price.toFixed(0),
        })),
      });
    }
    let discount = new D(0);
    let promotion = null;
    if (couponCode) {
      const p = await tx.promotion.findUnique({
        where: { code: couponCode.trim().toUpperCase() },
      });
      const now = new Date();
      if (
        !p?.isActive ||
        now < p.startDate ||
        now > p.endDate ||
        p.usedCount + p.reservedCount >= p.usageLimit ||
        (p.minOrderValue && subtotal.lt(p.minOrderValue))
      )
        fail(
          'COUPON_INVALID',
          'Mã giảm giá không hợp lệ, hết lượt hoặc chưa đủ điều kiện.',
          422,
        );
      discount =
        p.discountType === 'PERCENTAGE'
          ? subtotal.times(p.discountValue).div(100).floor()
          : p.discountValue;
      discount = D.min(discount, subtotal.times('.5').floor());
      if (p.maxDiscount !== null) discount = D.min(discount, p.maxDiscount);
      promotion = p;
    }
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    const after = subtotal.minus(discount);
    const maxPoints = D.min(
      user.loyaltyPoints - user.reservedPoints + excludeHeldPoints,
      after.times('.2').div(100).floor(),
    ).toNumber();
    if (
      !Number.isInteger(pointsUsed) ||
      pointsUsed < 0 ||
      pointsUsed > maxPoints
    )
      fail(
        'POINTS_EXCEED_CAP',
        'Điểm vượt số dư khả dụng hoặc giới hạn 20%.',
        422,
      );
    const pointsDiscount = new D(pointsUsed).times(100);
    const finalTotal = after.minus(pointsDiscount);
    if (finalTotal.lte(0))
      fail('INVALID_TOTAL', 'Đơn hàng phải có tổng thanh toán lớn hơn 0.');
    const result = {
      items: lines,
      subtotal: subtotal.toFixed(0),
      discountAmount: discount.toFixed(0),
      pointsUsed,
      pointsDiscount: pointsDiscount.toFixed(0),
      finalTotal: finalTotal.toFixed(0),
      appliedCoupon: promotion ? { code: promotion.code } : null,
    };
    return {
      ...result,
      quoteFingerprint: hash({
        ...result,
        items: [...lines].sort((a, b) =>
          JSON.stringify(a).localeCompare(JSON.stringify(b)),
        ),
      }),
      promotionId: promotion?.id ?? null,
      amounts,
    };
  }
  async quote(userId: string, body: unknown) {
    const o = record(body);
    if (!Array.isArray(o.items)) fail('EMPTY_CART', 'Giỏ hàng không hợp lệ.');
    const p = await this.price(
      this.db,
      userId,
      o.items.map(input),
      text(o.couponCode ?? '', 80),
      integer(o.pointsUsed ?? 0),
    );
    const { amounts: _a, promotionId: _p, ...result } = p;
    return result;
  }
  private async cartData(tx: Tx, userId: string) {
    const cart = await tx.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: { include: { category: true } },
            size: true,
            toppings: { include: { topping: true } },
          },
          orderBy: { id: 'asc' },
        },
      },
    });
    if (!cart) return { id: null, version: 0, items: [], subtotal: '0', canCheckout: false };
    let subtotal = new D(0);
    const totals = new Map<string, number>();
    for (const item of cart.items) if (item.sizeId) totals.set(item.sizeId, (totals.get(item.sizeId) ?? 0) + item.quantity);
    const items = cart.items.map((i) => {
      const issues: { code: string; message: string }[] = [];
      const availableQuantity = i.size?.onHand == null ? null : i.size.onHand - i.size.reserved;
      if (i.requiresConfiguration || !i.sizeId) issues.push({ code: 'CONFIGURATION_REQUIRED', message: 'Cần chọn lại Size/Topping cho món này.' });
      if (!i.product.isAvailable || i.product.category?.isActive === false || i.size?.isAvailable === false) issues.push({ code: 'UNAVAILABLE', message: 'Món hoặc Size đã ngừng bán.' });
      if (i.sizeId && availableQuantity === null) issues.push({ code: 'INVENTORY_UNINITIALIZED', message: 'Chưa nhập tồn kho.' });
      if (i.sizeId && availableQuantity !== null && (totals.get(i.sizeId) ?? 0) > availableQuantity) issues.push({ code: 'OUT_OF_STOCK', message: 'Số lượng trong giỏ vượt tồn khả dụng.' });
      if (i.toppings.some((t) => !t.topping.isAvailable)) issues.push({ code: 'INVALID_TOPPING', message: 'Có topping đã ngừng bán. Vui lòng điều chỉnh.' });
      const unit = i.product.basePrice
        .plus(i.size?.extraPrice ?? 0)
        .plus(
          i.toppings.reduce((sum, t) => sum.plus(t.topping.price), new D(0)),
        );
      subtotal = subtotal.plus(unit.times(i.quantity));
      return {
        id: i.id,
        key: i.id,
        productId: i.productId,
        sizeId: i.sizeId,
        name: i.product.name,
        sizeName: i.size?.name ?? 'Cần chọn lại size',
        imageUrl: i.product.imageUrl,
        quantity: i.quantity,
        note: i.note ?? '',
        unitPrice: unit.toFixed(0),
        lineTotal: unit.times(i.quantity).toFixed(0),
        requiresConfiguration: i.requiresConfiguration,
        issues,
        isValid: issues.length === 0,
        availableQuantity,
        toppings: i.toppings.map((t) => ({
          id: t.toppingId,
          name: t.topping.name,
          price: t.topping.price.toFixed(0),
        })),
      };
    });
    return {
      id: cart.id,
      version: cart.version,
      items,
      canCheckout: items.length > 0 && items.every((item) => item.isValid),
      subtotal: subtotal.toFixed(0),
    };
  }
  cart(userId: string) {
    return this.cartData(this.db, userId);
  }
  private async validateConfiguredCart(tx: Tx, cartId: string, sizeIds: Set<string>) {
    for (const sizeId of sizeIds) {
      const size = await this.inventory.getAvailableStock(sizeId, tx);
      const sum = await tx.cartItem.aggregate({ where: { cartId, sizeId, requiresConfiguration: false }, _sum: { quantity: true } });
      const total = sum._sum.quantity ?? 0;
      if (size.availableQuantity === null || total > size.availableQuantity)
        throw new ConflictException({
          code: 'OUT_OF_STOCK',
          message: 'Tổng số lượng các cấu hình cùng Size vượt tồn khả dụng.',
          details: {
            sizeId: size.id,
            requested: total,
            availableQuantity: size.availableQuantity,
          },
        });
    }
  }
  async mutateCart(
    userId: string,
    operation: string,
    body: unknown,
    itemId?: string,
    requestKey?: string,
  ) {
    const o = record(body);
    const chosen = operation === 'delete' ? null : input(body);
    return this.idem(
      userId,
      'cart.' + operation,
      requestKey,
      {
        itemId: itemId ?? null,
        chosen,
        expectedVersion: o.expectedVersion ?? null,
      },
      async (tx) => {
        const cart = await tx.cart.upsert({
          where: { userId },
          create: { userId },
          update: {},
        });
        if (
          o.expectedVersion !== undefined &&
          integer(o.expectedVersion) !== cart.version
        )
          fail('CART_CHANGED', 'Giỏ hàng đã thay đổi. Vui lòng tải lại.', 409);
        const existing = itemId
          ? await tx.cartItem.findFirst({
              where: { id: itemId, cartId: cart.id },
            })
          : null;
        if (itemId && !existing) fail('NOT_FOUND', 'Không tìm thấy món.', 404);
        if (operation === 'delete') {
          await tx.cartItem.delete({ where: { id: itemId! } });
        } else if (chosen) {
          if (existing && existing.productId !== chosen.productId)
            fail(
              'INVALID_OPTIONS',
              'Không chuyển dòng giỏ sang sản phẩm khác.',
            );
          await this.inventory.validateSellableConfiguration(chosen, tx);
          const key = configKey(chosen);
          const same = await tx.cartItem.findFirst({
            where: {
              cartId: cart.id,
              configurationKey: key,
              ...(itemId ? { NOT: { id: itemId } } : {}),
            },
          });
          const quantity = chosen.quantity + (same?.quantity ?? 0);
          if (quantity > 20)
            fail('QUANTITY_CONFLICT', 'Cấu hình trùng vượt quá 20 ly.', 409);
          if (same) {
            await tx.cartItem.update({
              where: { id: same.id },
              data: { quantity },
            });
            if (existing)
              await tx.cartItem.delete({ where: { id: existing.id } });
          } else if (existing) {
            const selections = await tx.cartItemTopping.findMany({
              where: { cartItemId: existing.id },
            });
            for (const selection of selections)
              await tx.cartItemTopping.delete({
                where: {
                  cartItemId_toppingId: {
                    cartItemId: selection.cartItemId,
                    toppingId: selection.toppingId,
                  },
                },
              });
            await tx.cartItem.update({
              where: { id: existing.id },
              data: {
                sizeId: chosen.sizeId,
                quantity,
                note: chosen.note,
                configurationKey: key,
                requiresConfiguration: false,
                toppings: {
                  create: chosen.toppingIds.map((toppingId) => ({ toppingId })),
                },
              },
            });
          } else
            await tx.cartItem.create({
              data: {
                cartId: cart.id,
                productId: chosen.productId,
                sizeId: chosen.sizeId,
                quantity,
                note: chosen.note,
                configurationKey: key,
                requiresConfiguration: false,
                toppings: {
                  create: chosen.toppingIds.map((toppingId) => ({ toppingId })),
                },
              },
            });
        }
        if (chosen) await this.validateConfiguredCart(tx, cart.id, new Set([chosen.sizeId]));
        await tx.cart.update({
          where: { id: cart.id },
          data: { version: { increment: 1 } },
        });
        return this.cartData(tx, userId);
      },
    );
  }
  async merge(userId: string, body: unknown, key?: string) {
    const o = record(body);
    if (!Array.isArray(o.items) || o.items.length > 50)
      fail('INVALID_INPUT', 'Giỏ local không hợp lệ.');
    const items = o.items.map(input);
    return this.idem(
      userId,
      'cart.merge',
      key,
      { items, expectedVersion: o.expectedVersion ?? null },
      async (tx) => {
        const cart = await tx.cart.upsert({
          where: { userId },
          create: { userId },
          update: {},
        });
        if (
          o.expectedVersion !== undefined &&
          integer(o.expectedVersion) !== cart.version
        )
          fail(
            'CART_CHANGED',
            'Giỏ hàng đã thay đổi. Vui lòng tải lại trước khi gộp.',
            409,
          );
        for (const [index, i] of items.entries()) {
          try { await this.inventory.validateSellableConfiguration(i, tx); }
          catch (error) {
            if (error instanceof HttpException) {
              const response = error.getResponse();
              const failure = typeof response === 'object' ? response as { code?: string; message?: string } : { message: response };
              throw new HttpException({ ...failure, code: failure.code ?? 'INVALID_OPTIONS', message: `Món tạm thứ ${index + 1}: ${failure.message ?? 'cấu hình không hợp lệ'}`, details: { itemIndex: index, productId: i.productId, sizeId: i.sizeId } }, error.getStatus());
            }
            throw error;
          }
          const configurationKey = configKey(i);
          const same = await tx.cartItem.findFirst({
            where: { cartId: cart.id, configurationKey },
          });
          const quantity = (same?.quantity ?? 0) + i.quantity;
          if (quantity > 20)
            fail(
              'QUANTITY_CONFLICT',
              'Gộp giỏ vượt quá 20 ly, dữ liệu local được giữ.',
              409,
            );
          if (same)
            await tx.cartItem.update({
              where: { id: same.id },
              data: { quantity },
            });
          else
            await tx.cartItem.create({
              data: {
                cartId: cart.id,
                productId: i.productId,
                sizeId: i.sizeId,
                quantity,
                note: i.note,
                configurationKey,
                requiresConfiguration: false,
                toppings: {
                  create: i.toppingIds.map((toppingId) => ({ toppingId })),
                },
              },
            });
        }
        await this.validateConfiguredCart(tx, cart.id, new Set(items.map((item) => item.sizeId)));
        await tx.cart.update({
          where: { id: cart.id },
          data: { version: { increment: 1 } },
        });
        return this.cartData(tx, userId);
      },
    );
  }
  async createOrder(userId: string, body: unknown, key?: string) {
    const o = record(body);
    const version = integer(o.cartVersion);
    const coupon = text(o.couponCode ?? '', 80);
    const points = integer(o.pointsUsed ?? 0);
    return this.idem(
      userId,
      'order.create',
      key,
      { version, coupon, points, fingerprint: o.quoteFingerprint },
      async (tx) => {
        const cart = await tx.cart.findUnique({
          where: { userId },
          include: { items: { include: { toppings: true } } },
        });
        if (!cart || cart.version !== version)
          fail('CART_CHANGED', 'Giỏ hàng đã thay đổi.', 409);
        if (cart.items.some((i) => i.requiresConfiguration || !i.sizeId))
          fail('INVALID_OPTIONS', 'Vui lòng cấu hình lại các món cũ.');
        const p = await this.price(
          tx,
          userId,
          cart.items.map((i) =>
            input({ ...i, toppingIds: i.toppings.map((t) => t.toppingId) }),
          ),
          coupon,
          points,
        );
        if (o.quoteFingerprint !== p.quoteFingerprint)
          fail(
            'PRICE_CHANGED',
            'Giá đã thay đổi, vui lòng tính lại và xác nhận.',
            409,
          );
        for (const [id, qty] of [...p.amounts].sort(([a], [b]) =>
          a.localeCompare(b),
        )) {
          const changed = await tx.size.updateMany({
            where: { id, onHand: { not: null } },
            data: { reserved: { increment: qty } },
          });
          if (!changed.count) fail('OUT_OF_STOCK', 'Món vừa hết hàng.', 409);
        }
        if (p.promotionId)
          await tx.promotion.update({
            where: { id: p.promotionId },
            data: { reservedCount: { increment: 1 } },
          });
        if (points)
          await tx.user.update({
            where: { id: userId },
            data: { reservedPoints: { increment: points } },
          });
        const expiresAt = new Date(Date.now() + 600000);
        const order = await tx.order.create({
          data: {
            orderCode: `BL-${Date.now()}-${randomUUID().slice(0, 8)}`,
            userId,
            isLegacy: false,
            expiresAt,
            subtotal: p.subtotal,
            discountAmount: p.discountAmount,
            pointsUsed: points,
            pointsDiscount: p.pointsDiscount,
            finalTotal: p.finalTotal,
            promotionId: p.promotionId,
            couponCodeSnapshot: coupon || null,
            items: {
              create: p.items.map((i) => ({
                productId: i.productId,
                sizeId: i.sizeId,
                productName: i.productName,
                sizeName: i.sizeName,
                unitPrice: i.unitPrice,
                quantity: i.quantity,
                lineTotal: i.lineTotal,
                note: i.note,
                toppings: {
                  create: i.toppings.map((t) => ({
                    toppingName: t.name,
                    price: t.price,
                  })),
                },
              })),
            },
            reservation: {
              create: {
                expiresAt,
                pointsReserved: points,
                createdAt: new Date(),
              },
            },
            history: {
              create: {
                toStatus: 'PENDING_PAYMENT',
                actorId: userId,
                orderVersion: 0,
              },
            },
          },
          include: orderInclude,
        });
        // Only the purchased cart is cleared, after its immutable snapshot and holds were committed together.
        for (const item of cart.items)
          await tx.cartItem.delete({ where: { id: item.id } });
        await tx.cart.update({
          where: { id: cart.id },
          data: { version: { increment: 1 } },
        });
        return order;
      },
    );
  }
  async orders(userId: string, all = false, queue = false) {
    return this.db.order.findMany({
      where: {
        isLegacy: false,
        ...(all ? {} : { userId }),
        ...(queue ? { status: { in: ['PAID', 'PREPARING', 'READY'] } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: orderInclude,
    });
  }
  async order(id: string, userId?: string) {
    const o = await this.db.order.findFirst({
      where: { id, isLegacy: false, ...(userId ? { userId } : {}) },
      include: orderInclude,
    });
    if (!o) fail('NOT_FOUND', 'Không tìm thấy đơn.', 404);
    return o;
  }
  private async release(tx: Tx, id: string, actorId?: string) {
    const o = await tx.order.findUniqueOrThrow({
      where: { id },
      include: { items: true, payments: true, reservation: true },
    });
    if (
      o.status !== 'PENDING_PAYMENT' ||
      !o.reservation ||
      o.reservation.state !== 'HELD'
    )
      fail('INVALID_STATE', 'Đơn không thể hủy.', 409);
    if (o.payments.some((p) => ['PENDING', 'UNKNOWN'].includes(p.status)))
      fail(
        'PAYMENT_UNRESOLVED',
        'Đang xác minh thanh toán, chưa thể hủy.',
        409,
      );
    const changed = await tx.orderReservation.updateMany({
      where: { orderId: id, state: 'HELD' },
      data: { state: 'RELEASED', releasedAt: new Date() },
    });
    if (!changed.count) return o;
    for (const i of o.items)
      if (i.sizeId)
        await tx.size.update({
          where: { id: i.sizeId },
          data: { reserved: { decrement: i.quantity } },
        });
    if (o.userId && o.pointsUsed)
      await tx.user.update({
        where: { id: o.userId },
        data: { reservedPoints: { decrement: o.pointsUsed } },
      });
    if (o.promotionId)
      await tx.promotion.update({
        where: { id: o.promotionId },
        data: { reservedCount: { decrement: 1 } },
      });
    return tx.order.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        version: { increment: 1 },
        history: {
          create: {
            fromStatus: o.status,
            toStatus: 'CANCELLED',
            actorId,
            orderVersion: o.version + 1,
          },
        },
      },
      include: orderInclude,
    });
  }
  async cancel(userId: string, id: string, key?: string) {
    await this.order(id, userId);
    return this.idem(userId, 'order.cancel', key, { id }, (tx) =>
      this.release(tx, id, userId),
    );
  }
  async transition(actorId: string, id: string, body: unknown, key?: string) {
    const b = record(body);
    const next = text(b.nextStatus, 30);
    const version = integer(b.expectedVersion);
    return this.idem(
      actorId,
      'order.status',
      key,
      { id, next, version },
      async (tx) => {
        const o = await tx.order.findFirst({ where: { id, isLegacy: false } });
        if (!o) fail('NOT_FOUND', 'Không tìm thấy đơn.', 404);
        const steps: Record<string, string> = {
          PAID: 'PREPARING',
          PREPARING: 'READY',
          READY: 'COMPLETED',
        };
        if (o.version !== version || steps[o.status] !== next)
          fail(
            'INVALID_ORDER_TRANSITION',
            'Đơn đã đổi hoặc trạng thái không hợp lệ.',
            409,
          );
        if (next === 'COMPLETED' && o.userId) {
          const points = o.finalTotal.div(10000).floor().toNumber();
          const user = await tx.user.update({
            where: { id: o.userId },
            data: { loyaltyPoints: { increment: points } },
          });
          await tx.loyaltyTransaction.create({
            data: {
              userId: o.userId,
              orderId: id,
              type: 'EARN',
              points,
              balanceAfter: user.loyaltyPoints,
              role: 'CUSTOMER',
            },
          });
        }
        if (o.userId)
          await tx.notification.create({
            data: {
              userId: o.userId,
              orderId: id,
              type: 'ORDER_STATUS_UPDATED',
              title: 'Trạng thái đơn hàng',
              content: `${o.orderCode}: ${next}`,
              eventKey: `${id}:${next}`,
            },
          });
        return tx.order.update({
          where: { id },
          data: {
            status: next as OrderStatus,
            version: { increment: 1 },
            history: {
              create: {
                fromStatus: o.status,
                toStatus: next as OrderStatus,
                actorId,
                orderVersion: o.version + 1,
              },
            },
          },
          include: orderInclude,
        });
      },
    );
  }
  async pay(userId: string, id: string, body: unknown, key?: string) {
    const method = text(record(body).method, 20);
    if (!['WALLET', 'CARD'].includes(method))
      fail('INVALID_METHOD', 'Chỉ ví/thẻ mô phỏng.');
    return this.idem(
      userId,
      'payment.create',
      key,
      { id, method },
      async (tx) => {
        const o = await tx.order.findFirst({
          where: { id, userId, isLegacy: false },
          include: { payments: true },
        });
        if (!o) fail('NOT_FOUND', 'Không tìm thấy đơn.', 404);
        if (
          o.status !== 'PENDING_PAYMENT' ||
          !o.expiresAt ||
          o.expiresAt.getTime() <= Date.now() ||
          o.payments.length >= 3 ||
          o.payments.some((p) => ['PENDING', 'UNKNOWN'].includes(p.status))
        )
          fail(
            'INVALID_PAYMENT_STATE',
            'Không thể tạo lần thanh toán mới.',
            409,
          );
        return tx.payment.create({
          data: {
            orderId: id,
            method: method as 'WALLET' | 'CARD',
            amount: o.finalTotal,
            attemptNumber: o.payments.length + 1,
            providerPaymentId: randomUUID(),
            status: 'UNKNOWN',
          },
        });
      },
    ).then(async (payment) => {
      const p = record(payment);
      return this.settle(String(p.id));
    });
  }
  async settle(paymentId: string) {
    // Only this Backend adapter chooses outcomes; the browser cannot send SUCCESS/FAILED.
    const outcome = process.env.MOCK_PAYMENT_OUTCOME ?? 'SUCCESS';
    if (outcome === 'UNKNOWN')
      return this.db.payment.findUniqueOrThrow({ where: { id: paymentId } });
    return this.tx(async (tx) => {
      const p = await tx.payment.findUniqueOrThrow({
        where: { id: paymentId },
      });
      if (p.status === 'SUCCESS' || p.status === 'FAILED') return p;
      const o = await tx.order.findUniqueOrThrow({
        where: { id: p.orderId },
        include: { items: true, reservation: true },
      });
      const status: PaymentStatus = outcome === 'FAILED' ? 'FAILED' : 'SUCCESS';
      if (
        status === 'SUCCESS' &&
        (o.status !== 'PENDING_PAYMENT' ||
          o.reservation?.state !== 'HELD' ||
          !p.amount.equals(o.finalTotal))
      )
        fail('RECONCILIATION_REQUIRED', 'Thanh toán cần đối soát.', 409);
      await tx.paymentEvent.create({
        data: {
          paymentId: p.id,
          providerEventId: `mock:${p.providerPaymentId}:final`,
          processingStatus: 'PROCESSED',
          processedAt: new Date(),
          amount: p.amount,
          outcome: status,
        },
      });
      if (status === 'SUCCESS') {
        for (const i of o.items)
          if (i.sizeId)
            await tx.size.update({
              where: { id: i.sizeId },
              data: {
                onHand: { decrement: i.quantity },
                reserved: { decrement: i.quantity },
              },
            });
        if (o.userId) {
          const user = await tx.user.update({
            where: { id: o.userId },
            data: {
              loyaltyPoints: { decrement: o.pointsUsed },
              reservedPoints: { decrement: o.pointsUsed },
            },
          });
          if (o.pointsUsed)
            await tx.loyaltyTransaction.create({
              data: {
                userId: o.userId,
                orderId: o.id,
                type: 'REDEEM',
                points: -o.pointsUsed,
                balanceAfter: user.loyaltyPoints,
                role: 'CUSTOMER',
              },
            });
          await tx.notification.create({
            data: {
              userId: o.userId,
              orderId: o.id,
              type: 'PAYMENT_SUCCESS',
              title: 'Thanh toán mô phỏng thành công',
              content: o.orderCode,
              eventKey: `${o.id}:PAID`,
            },
          });
        }
        if (o.promotionId)
          await tx.promotion.update({
            where: { id: o.promotionId },
            data: {
              reservedCount: { decrement: 1 },
              usedCount: { increment: 1 },
            },
          });
        await tx.orderReservation.update({
          where: { orderId: o.id },
          data: { state: 'CONSUMED', consumedAt: new Date() },
        });
        await tx.order.update({
          where: { id: o.id },
          data: {
            status: 'PAID',
            version: { increment: 1 },
            history: {
              create: {
                fromStatus: o.status,
                toStatus: 'PAID',
                orderVersion: o.version + 1,
              },
            },
          },
        });
      }
      return tx.payment.update({
        where: { id: p.id },
        data: {
          status,
          paidAt: status === 'SUCCESS' ? new Date() : null,
          failureReason:
            status === 'FAILED' ? 'Cổng mô phỏng từ chối giao dịch.' : null,
        },
      });
    });
  }
  async payment(userId: string, id: string) {
    const p = await this.db.payment.findFirst({
      where: { id, order: { userId, isLegacy: false } },
    });
    if (!p) fail('NOT_FOUND', 'Không tìm thấy thanh toán.', 404);
    return p.status === 'UNKNOWN' ? this.settle(id) : p;
  }
  async reconcile() {
    const unknown = await this.db.payment.findMany({
      where: { status: 'UNKNOWN', order: { isLegacy: false } },
      take: 20,
    });
    for (const p of unknown) await this.settle(p.id);
    const expired = await this.db.orderReservation.findMany({
      where: {
        state: 'HELD',
        expiresAt: { lt: new Date() },
        order: {
          isLegacy: false,
          status: 'PENDING_PAYMENT',
          payments: { none: { status: { in: ['PENDING', 'UNKNOWN'] } } },
        },
      },
      take: 20,
    });
    for (const r of expired) await this.tx((tx) => this.release(tx, r.orderId));
  }
}
