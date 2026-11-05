import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ToppingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.topping.findMany({
      where: { isAvailable: true },
      orderBy: { price: 'asc' },
    });
  }
}
