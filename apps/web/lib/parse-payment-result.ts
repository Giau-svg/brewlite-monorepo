import type { ConfirmedPayment, PaymentOutcome } from "../types/payment-result";

const VIETNAMESE_TEXT =
  /[ăâêôơưáàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵđ]/i;

const SAFE_ID = /^[A-Za-z0-9_-]{1,80}$/;

function text(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) return null;
  if (/[\u0000-\u001F]/.test(trimmed)) return null;
  return trimmed;
}

function methodLabel(value: unknown): string {
  if (value === "WALLET") return "Ví";
  if (value === "CARD") return "Thẻ";
  return "Chưa rõ cách thanh toán";
}

function readConfirmation(body: Record<string, unknown>): ConfirmedPayment | null {
  const orderId = text(body.orderId, 80);
  const orderCode = text(body.orderCode, 40);
  const transactionRef = text(body.transactionRef, 80);
  const paidAt = text(body.paidAt, 40);
  const amount = typeof body.amount === "number" ? body.amount : Number.NaN;
  if (!orderId || !SAFE_ID.test(orderId) || !orderCode || !transactionRef || !paidAt) return null;
  if (!Number.isFinite(amount) || amount < 0) return null;
  if (Number.isNaN(new Date(paidAt).getTime())) return null;
  return {
    orderId,
    orderCode,
    transactionRef,
    amount,
    paidAt,
    methodLabel: methodLabel(body.method),
  };
}

/**
 * Chỉ coi là thành công khi payload có đủ xác nhận.
 * Trạng thái khác SUCCESS không bị đổi thành thất bại.
 * Hàm này không đọc query string hay localStorage.
 */
export function parsePaymentPayload(payload: unknown): PaymentOutcome {
  if (!payload || typeof payload !== "object") return { kind: "missing" };
  const body = payload as Record<string, unknown>;
  const status = text(body.status, 40)?.toUpperCase();
  if (!status) return { kind: "missing" };

  if (status === "FAILED") {
    const reason = text(body.failureReason, 240);
    return {
      kind: "failed",
      message: reason && VIETNAMESE_TEXT.test(reason) ? reason : "Thanh toán chưa được ghi nhận.",
      retrySupported: body.retrySupported === true,
    };
  }

  if (status === "SUCCESS") {
    const payment = readConfirmation(body);
    if (!payment) return { kind: "pending" };
    return { kind: "success", payment };
  }

  return { kind: "pending" };
}
