import {
  Controller,
  Get,
  Patch,
  Param,
  Req,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  JwtAuthGuard,
  OriginGuard,
  RolesGuard,
  Roles,
  type AuthRequest,
} from '../auth/auth.guards';
@Controller('account')
@UseGuards(OriginGuard, JwtAuthGuard, RolesGuard)
@Roles('CUSTOMER')
export class AccountController {
  constructor(private readonly db: PrismaService) {}
  @Get('loyalty') async loyalty(@Req() r: AuthRequest) {
    const userId = r.principal.user.id;
    const user = await this.db.user.findUniqueOrThrow({
      where: { id: userId },
      select: { loyaltyPoints: true, reservedPoints: true },
    });
    const transactions = await this.db.loyaltyTransaction.findMany({
      where: { userId, order: { isLegacy: false } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return {
      ...user,
      availablePoints: user.loyaltyPoints - user.reservedPoints,
      transactions,
    };
  }
  @Get('notifications') notifications(@Req() r: AuthRequest) {
    return this.db.notification.findMany({
      where: { userId: r.principal.user.id, order: { isLegacy: false } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
  @Patch('notifications/:id/read') async read(
    @Req() r: AuthRequest,
    @Param('id') id: string,
  ) {
    const result = await this.db.notification.updateMany({
      where: { id, userId: r.principal.user.id },
      data: { isRead: true },
    });
    if (!result.count) throw new NotFoundException();
    return { id, isRead: true };
  }
}
