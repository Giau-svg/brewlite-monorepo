import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard, OriginGuard, Roles, RolesGuard } from './auth.guards';
import { publicUserSelect } from './auth.service';

@Controller('admin')
@UseGuards(OriginGuard, JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}
  @Get('users')
  users() {
    return this.prisma.user.findMany({
      select: publicUserSelect,
      take: 100,
      orderBy: { createdAt: 'desc' },
    });
  }
}
