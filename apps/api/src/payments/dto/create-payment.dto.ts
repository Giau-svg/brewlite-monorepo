import { PaymentMethod } from '@prisma/client';
import { IsEnum, IsUUID } from 'class-validator';

export class CreatePaymentDto {
  @IsUUID()
  orderId!: string;

  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @IsUUID()
  idempotencyKey!: string;
}
