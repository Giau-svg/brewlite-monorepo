import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const products = await this.prisma.product.findMany({
      where: { isAvailable: true },
      include: {
        category: true,
        sizes: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Trả về kèm price và image để tương thích 100% với Frontend Next.js types/product.ts
    return products.map((p) => ({
      ...p,
      price: Number(p.basePrice),
      image: p.imageUrl ?? '☕',
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

    if (!product) {
      throw new NotFoundException(`Sản phẩm với ID ${id} không tồn tại.`);
    }

    // Lấy kèm danh sách topping khả dụng để màn hình chi tiết món hiển thị tùy chọn cho khách
    const availableToppings = await this.prisma.topping.findMany({
      where: { isAvailable: true },
      orderBy: { price: 'asc' },
    });

    return {
      ...product,
      availableToppings,
    };
  }
}
