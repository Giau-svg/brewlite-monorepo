import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto, CalculateQuoteDto } from './dto/cart.dto';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  /**
   * FR-07: Tính toán tổng tiền đơn hàng / Quote giá (Subtotal, Giảm giá, Tổng cộng)
   */
  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  async calculateQuote(@Body() dto: CalculateQuoteDto) {
    return this.cartService.calculateQuote(dto);
  }

  /**
   * Lấy giỏ hàng
   */
  @Get()
  async getCart(
    @Query('userId') userId?: string,
    @Query('sessionId') sessionId?: string,
  ) {
    return this.cartService.getCart(userId, sessionId);
  }

  /**
   * Thêm món vào giỏ
   */
  @Post('items')
  async addItem(@Body() dto: AddToCartDto) {
    return this.cartService.addToCart(dto);
  }

  /**
   * Xóa món khỏi giỏ
   */
  @Delete('items/:id')
  async removeItem(@Param('id') id: string) {
    return this.cartService.removeItem(id);
  }

  /**
   * Dọn sạch giỏ
   */
  @Delete(':cartId')
  async clearCart(@Param('cartId') cartId: string) {
    return this.cartService.clearCart(cartId);
  }
}
