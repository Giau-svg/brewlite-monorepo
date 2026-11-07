import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { MockPaymentService } from './mock-payment.service';

@Module({
  providers: [PaymentsService, MockPaymentService],
  controllers: [PaymentsController],
})
export class PaymentsModule {}
