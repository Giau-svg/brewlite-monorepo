import {
  ConfiguredCartItemDto,
  ConfiguredQuoteDto,
  MergeConfiguredCartDto,
} from './cart.dto';
import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Req,
  Headers,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import type { AuthRequest } from '../auth/auth.guards';
import {
  JwtAuthGuard,
  OriginGuard,
  RolesGuard,
  Roles,
} from '../auth/auth.guards';
import { CommerceService } from './commerce.service';

@Controller('cart')
@UseGuards(OriginGuard, JwtAuthGuard, RolesGuard)
@Roles('CUSTOMER')
export class ConfiguredCartController {
  constructor(private readonly service: CommerceService) {}
  @Get() cart(@Req() r: AuthRequest) {
    return this.service.cart(r.principal.user.id);
  }
  @Post('calculate') @HttpCode(200) quote(
    @Req() r: AuthRequest,
    @Body() b: ConfiguredQuoteDto,
  ) {
    return this.service.quote(r.principal.user.id, b);
  }
  @Post('items') add(
    @Req() r: AuthRequest,
    @Body() b: ConfiguredCartItemDto,
    @Headers('idempotency-key') key?: string,
  ) {
    return this.service.mutateCart(
      r.principal.user.id,
      'add',
      b,
      undefined,
      key,
    );
  }
  @Patch('items/:id') edit(
    @Req() r: AuthRequest,
    @Param('id') id: string,
    @Body() b: ConfiguredCartItemDto,
    @Headers('idempotency-key') key?: string,
  ) {
    return this.service.mutateCart(r.principal.user.id, 'edit', b, id, key);
  }
  @Delete('items/:id') remove(
    @Req() r: AuthRequest,
    @Param('id') id: string,
    @Body() b: unknown,
    @Headers('idempotency-key') key?: string,
  ) {
    return this.service.mutateCart(
      r.principal.user.id,
      'delete',
      b ?? {},
      id,
      key,
    );
  }
  @Post('merge') @HttpCode(200) merge(
    @Req() r: AuthRequest,
    @Body() b: MergeConfiguredCartDto,
    @Headers('idempotency-key') key?: string,
  ) {
    return this.service.merge(r.principal.user.id, b, key);
  }
}
@Controller('orders')
@UseGuards(OriginGuard, JwtAuthGuard, RolesGuard)
@Roles('CUSTOMER')
export class OrdersController {
  constructor(private readonly service: CommerceService) {}
  @Get() list(@Req() r: AuthRequest) {
    return this.service.orders(r.principal.user.id);
  }
  @Get(':id') detail(@Req() r: AuthRequest, @Param('id') id: string) {
    return this.service.order(id, r.principal.user.id);
  }
  @Post() create(
    @Req() r: AuthRequest,
    @Body() b: unknown,
    @Headers('idempotency-key') key?: string,
  ) {
    return this.service.createOrder(r.principal.user.id, b, key);
  }
  @Post(':id/cancel') @HttpCode(200) cancel(
    @Req() r: AuthRequest,
    @Param('id') id: string,
    @Headers('idempotency-key') key?: string,
  ) {
    return this.service.cancel(r.principal.user.id, id, key);
  }
  @Post(':id/payments') pay(
    @Req() r: AuthRequest,
    @Param('id') id: string,
    @Body() b: unknown,
    @Headers('idempotency-key') key?: string,
  ) {
    return this.service.pay(r.principal.user.id, id, b, key);
  }
}
@Controller('payments')
@UseGuards(OriginGuard, JwtAuthGuard, RolesGuard)
@Roles('CUSTOMER')
export class PaymentsController {
  constructor(private readonly service: CommerceService) {}
  @Get(':id') detail(@Req() r: AuthRequest, @Param('id') id: string) {
    return this.service.payment(r.principal.user.id, id);
  }
}
@Controller('staff/orders')
@UseGuards(OriginGuard, JwtAuthGuard, RolesGuard)
export class StaffOrdersController {
  constructor(private readonly service: CommerceService) {}
  @Get() @Roles('STAFF', 'ADMIN') list() {
    return this.service.orders('', true, true);
  }
  @Patch(':id/status') @Roles('STAFF') update(
    @Req() r: AuthRequest,
    @Param('id') id: string,
    @Body() b: unknown,
    @Headers('idempotency-key') key?: string,
  ) {
    return this.service.transition(r.principal.user.id, id, b, key);
  }
}
