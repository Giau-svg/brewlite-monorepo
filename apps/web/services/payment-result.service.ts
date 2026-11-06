import type { PaymentOutcome } from "../types/payment-result";

/**
 * Điểm tích hợp xác nhận thanh toán.
 * Backend hiện chưa có endpoint Orders/Payments, nên hàm này không gọi mạng
 * và không đọc query string hay localStorage.
 * Khi có hợp đồng API, hãy lấy JSON từ endpoint đó rồi trả về parsePaymentPayload(json).
 */
export async function loadPaymentResult(): Promise<PaymentOutcome> {
  return { kind: "missing" };
}

/**
 * Chưa có hợp đồng thử thanh toán lại, nên hàm này không gửi POST.
 */
export async function retryPayment(): Promise<{ accepted: false; message: string }> {
  return {
    accepted: false,
    message: "Chưa thể thử thanh toán lại lúc này.",
  };
}
