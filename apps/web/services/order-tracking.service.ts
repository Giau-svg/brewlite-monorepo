import type { OrderTrackingResult } from "../types/order-tracking";

function hasOrderReference(orderId: string): boolean {
  const id = orderId.trim();
  return /^[A-Za-z0-9_-]{1,80}$/.test(id);
}

/**
 * Điểm tích hợp theo dõi đơn.
 * SRS có GET /orders/:id như hợp đồng tham chiếu, nhưng Backend trên main chưa có module Orders.
 * Hàm này không gọi mạng và không coi orderId trên URL là quyền xem đơn.
 * Khi API được xác nhận, hãy tải JSON bằng phiên của khách rồi trả về parseTrackedOrder(json, orderId).
 * Làm mới sau này chỉ gọi lại hàm này theo polling hoặc sự kiện Backend, không tự đổi trạng thái đơn.
 */
export async function loadTrackedOrder(orderId: string): Promise<OrderTrackingResult> {
  if (!hasOrderReference(orderId)) return { kind: "missing" };
  return { kind: "unavailable" };
}
