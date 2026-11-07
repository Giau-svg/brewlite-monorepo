import { Controller, Get, Post, Delete, Body, Param, Req, HttpCode, HttpStatus, NotFoundException, UseGuards } from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto, CalculateQuoteDto } from './dto/cart.dto';
import { JwtAuthGuard, OriginGuard } from '../auth/auth.guards';
import type { AuthRequest } from '../auth/auth.guards';
import { PrismaService } from '../prisma/prisma.service';

@Controller('cart')
@UseGuards(OriginGuard, JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService, private readonly prisma: PrismaService) {}

  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  calculateQuote(@Body() dto: CalculateQuoteDto, @Req() request: AuthRequest) {
    return this.cartService.calculateQuote({ items: dto.items, couponCode: dto.couponCode, pointsUsed: dto.pointsUsed, userId: request.principal.user.id });
  }
  @Get()
  getCart(@Req() request: AuthRequest) { return this.cartService.getCart(request.principal.user.id); }

  @Post('items')
  addItem(@Body() dto: AddToCartDto, @Req() request: AuthRequest) {
    return this.cartService.addToCart({ productId: dto.productId, quantity: dto.quantity, note: dto.note, userId: request.principal.user.id });
  }
  @Delete('items/:id')
  async removeItem(@Param('id') id: string, @Req() request: AuthRequest) {
    const item = await this.prisma.cartItem.findFirst({ where: { id, cart: { userId: request.principal.user.id } }, select: { id: true } });
    if (!item) throw new NotFoundException('Không tìm thấy món trong giỏ.');
    return this.cartService.removeItem(id);
  }
  @Delete(':cartId')
  async clearCart(@Param('cartId') cartId: string, @Req() request: AuthRequest) {
    const cart = await this.prisma.cart.findFirst({ where: { id: cartId, userId: request.principal.user.id }, select: { id: true } });
    if (!cart) throw new NotFoundException('Không tìm thấy giỏ hàng.');
    return this.cartService.clearCart(cartId);
  }
}