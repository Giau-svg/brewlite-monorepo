import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type Size } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
type Client = Pick<Prisma.TransactionClient, 'size' | 'product' | 'topping'>;
export type SellableConfiguration = {
  productId: string;
  sizeId: string;
  toppingIds: string[];
  quantity: number;
};
export function availableStock(
  stock: Pick<Size, 'onHand' | 'reserved'>,
): number | null {
  if (
    !Number.isInteger(stock.reserved) ||
    stock.reserved < 0 ||
    (stock.onHand === null
      ? stock.reserved !== 0
      : !Number.isInteger(stock.onHand) ||
        stock.onHand < 0 ||
        stock.reserved > stock.onHand)
  )
    throw new ConflictException({
      code: 'INVALID_INVENTORY',
      message: 'Dữ liệu tồn kho không hợp lệ.',
    });
  return stock.onHand === null ? null : stock.onHand - stock.reserved;
}
function quantity(value: number) {
  if (!Number.isInteger(value) || value < 1 || value > 20)
    throw new BadRequestException('Số lượng phải từ 1 đến 20.');
}
function inventoryAmount(value: number) {
  if (!Number.isInteger(value) || value < 1 || value > 2147483647)
    throw new BadRequestException('Lượng kho phải là số nguyên dương hợp lệ.');
}
@Injectable()
export class InventoryService {
  constructor(private readonly db: PrismaService) {}
  async getAvailableStock(sizeId: string, tx: Client = this.db) {
    const size = await tx.size.findUnique({ where: { id: sizeId } });
    if (!size) throw new NotFoundException('Không tìm thấy Size.');
    return { ...size, availableQuantity: availableStock(size) };
  }
  async validateSizeBelongsToProduct(
    productId: string,
    sizeId: string,
    tx: Client = this.db,
  ) {
    const size = await this.getAvailableStock(sizeId, tx);
    if (size.productId !== productId)
      throw new BadRequestException({
        code: 'INVALID_OPTIONS',
        message: 'Size không thuộc sản phẩm đã chọn.',
      });
    return size;
  }
  async validateSellableConfiguration(
    input: SellableConfiguration,
    tx: Client = this.db,
  ) {
    quantity(input.quantity);
    if (
      !Array.isArray(input.toppingIds) ||
      input.toppingIds.length > 30 ||
      input.toppingIds.some((id) => typeof id !== 'string') ||
      new Set(input.toppingIds).size !== input.toppingIds.length
    )
      throw new BadRequestException('Topping trùng hoặc không hợp lệ.');
    const product = await tx.product.findUnique({
      where: { id: input.productId },
      include: { category: true },
    });
    const size = await this.validateSizeBelongsToProduct(
      input.productId,
      input.sizeId,
      tx,
    );
    if (
      !product?.isAvailable ||
      product.category?.isActive === false ||
      !size.isAvailable
    )
      throw new BadRequestException({
        code: 'INVALID_OPTIONS',
        message: 'Sản phẩm hoặc Size đã ngừng bán.',
      });
    if (size.availableQuantity === null)
      throw new ConflictException({
        code: 'INVENTORY_UNINITIALIZED',
        message: 'Size chưa được nhập tồn kho.',
      });
    if (size.availableQuantity < input.quantity)
      throw new ConflictException({
        code: 'OUT_OF_STOCK',
        message: 'Món vừa hết hoặc không đủ hàng.',
      });
    const toppings = await tx.topping.findMany({
      where: { id: { in: input.toppingIds }, isAvailable: true },
      orderBy: { id: 'asc' },
    });
    if (toppings.length !== input.toppingIds.length)
      throw new BadRequestException({
        code: 'INVALID_OPTIONS',
        message: 'Topping không tồn tại hoặc đã ngừng bán.',
      });
    return { product, size, toppings };
  }
  // Internal primitives only. Caller owns a DB transaction and reservation lifecycle/idempotency.
  async reserve(tx: Prisma.TransactionClient, sizeId: string, amount: number) {
    inventoryAmount(amount);
    const rows = await tx.$queryRaw<
      Size[]
    >`UPDATE sizes SET reserved=reserved+${amount}, version=version+1 WHERE id=${sizeId} AND "isAvailable"=true AND "onHand" IS NOT NULL AND "onHand"-reserved>=${amount} RETURNING *`;
    if (!rows.length)
      throw new ConflictException({
        code: 'OUT_OF_STOCK',
        message: 'Không đủ tồn khả dụng để giữ.',
      });
    return rows[0];
  }
  async consume(tx: Prisma.TransactionClient, sizeId: string, amount: number) {
    inventoryAmount(amount);
    const rows = await tx.$queryRaw<
      Size[]
    >`UPDATE sizes SET "onHand"="onHand"-${amount}, reserved=reserved-${amount}, version=version+1 WHERE id=${sizeId} AND "onHand" IS NOT NULL AND "onHand">=${amount} AND reserved>=${amount} RETURNING *`;
    if (!rows.length)
      throw new ConflictException('Không có đủ tồn đã giữ để tiêu thụ.');
    return rows[0];
  }
  async release(tx: Prisma.TransactionClient, sizeId: string, amount: number) {
    inventoryAmount(amount);
    const rows = await tx.$queryRaw<
      Size[]
    >`UPDATE sizes SET reserved=reserved-${amount}, version=version+1 WHERE id=${sizeId} AND reserved>=${amount} RETURNING *`;
    if (!rows.length)
      throw new ConflictException('Không có đủ tồn đã giữ để giải phóng.');
    return rows[0];
  }
  async setOnHand(
    tx: Prisma.TransactionClient,
    sizeId: string,
    onHand: number,
    expectedVersion: number,
  ) {
    if (
      !Number.isInteger(onHand) ||
      onHand < 0 ||
      onHand > 2147483647 ||
      !Number.isInteger(expectedVersion) ||
      expectedVersion < 0 ||
      expectedVersion > 2147483647
    )
      throw new BadRequestException(
        'Số tồn và phiên bản phải là số nguyên không âm hợp lệ.',
      );
    const rows = await tx.$queryRaw<
      Size[]
    >`UPDATE sizes SET "onHand"=${onHand}, version=version+1 WHERE id=${sizeId} AND version=${expectedVersion} AND reserved<=${onHand} RETURNING *`;
    if (!rows.length) {
      const current = await this.getAvailableStock(sizeId, tx);
      if (current.version !== expectedVersion)
        throw new ConflictException({
          code: 'INVENTORY_CHANGED',
          message: 'Tồn kho đã thay đổi. Vui lòng tải lại.',
        });
      throw new BadRequestException(
        'Tồn thực tế không được nhỏ hơn lượng đang giữ.',
      );
    }
    return rows[0];
  }
}
