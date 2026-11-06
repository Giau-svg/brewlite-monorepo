import type { StaffBoard, StaffOrderStatus, StaffUpdateResult } from "../types/staff-order";

/**
 * Điểm tích hợp danh sách đơn của quầy.
 * SRS ghi GET /staff/orders là hợp đồng tham chiếu, nhưng Backend chưa có module này
 * và Frontend chưa có phiên nhân viên đã xác thực.
 * Hàm không gọi mạng và không tạo đơn.
 * Khi API sẵn sàng, tải JSON bằng phiên nhân viên rồi trả về parseStaffBoard(json).
 */
export async function loadStaffOrders(): Promise<StaffBoard> {
  return { kind: "unavailable" };
}

/**
 * Điểm tích hợp chuyển trạng thái.
 * SRS ghi PATCH /staff/orders/:id/status, nhưng endpoint chưa tồn tại.
 * Hàm không gửi yêu cầu và không báo đã chuyển trạng thái.
 * Khi API sẵn sàng, chỉ trả accepted khi phản hồi xác nhận đúng trạng thái mới.
 */
export async function updateStaffOrderStatus(
  orderId: string,
  status: StaffOrderStatus,
): Promise<StaffUpdateResult> {
  void orderId;
  void status;
  return { accepted: false, reason: "unavailable" };
}
