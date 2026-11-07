import type { Size } from '@prisma/client';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function publicSize(size: Size) {
  const availableQuantity =
    size.onHand === null ? null : size.onHand - size.reserved;
  const inventoryStatus =
    availableQuantity === null
      ? 'UNINITIALIZED'
      : size.isAvailable && availableQuantity > 0
        ? 'AVAILABLE'
        : 'OUT_OF_STOCK';
  return { ...size, availableQuantity, inventoryStatus };
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const products = await this.prisma.product.findMany({
      where: {
        isAvailable: true,
        OR: [{ categoryId: null }, { category: { isActive: true } }],
      },
      include: {
        category: true,
        sizes: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return products.map((product) => ({
      ...product,
      sizes: product.sizes.map(publicSize),
    }));
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        sizes: true,
      },
    });

    if (
      !product ||
      !product.isAvailable ||
      (product.category && !product.category.isActive)
    ) {
      throw new NotFoundException(`Sản phẩm với ID ${id} không tồn tại.`);
    }

    // Lấy kèm danh sách topping khả dụng để màn hình chi tiết món hiển thị tùy chọn cho khách
    const availableToppings = await this.prisma.topping.findMany({
      where: { isAvailable: true },
      orderBy: { price: 'asc' },
    });

    return {
      ...product,
      sizes: product.sizes.map(publicSize),
      availableToppings,
    };
  }
}
