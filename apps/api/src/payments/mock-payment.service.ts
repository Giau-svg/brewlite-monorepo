import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

@Injectable()
export class MockPaymentService {
  pay() {
    const result = process.env.PAYMENT_MOCK_RESULT ?? 'SUCCESS';

    if (result === 'FAILED') {
      return {
        success: false as const,
        failureReason: 'Cổng thanh toán mô phỏng từ chối giao dịch.',
      };
    }

    if (result === 'SUCCESS') {
      return {
        success: true as const,
        transactionRef: `MOCK-${randomUUID()}`,
      };
    }

    throw new ServiceUnavailableException(
      'PAYMENT_MOCK_RESULT phải là SUCCESS hoặc FAILED.',
    );
  }
}
