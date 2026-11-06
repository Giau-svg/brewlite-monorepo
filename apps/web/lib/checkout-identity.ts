import type { CheckoutIdentity } from "../types/checkout";

/**
 * Điểm tích hợp Auth cho Checkout.
 * Login hiện chỉ kiểm tra form và không lưu JWT, userId hay sessionId.
 * Không tự tạo định danh khách ở đây.
 * Khi Auth có phiên thật, hàm này cần trả về userId hoặc sessionId từ phiên đó.
 */
export function getCheckoutIdentity(): CheckoutIdentity | null {
  return null;
}

export function hasCheckoutIdentity(
  identity: CheckoutIdentity | null,
): identity is CheckoutIdentity {
  if (!identity) return false;
  return Boolean(identity.userId?.trim() || identity.sessionId?.trim());
}
