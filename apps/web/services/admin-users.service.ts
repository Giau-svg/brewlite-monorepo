import type { AdminUserAccountStatus, AdminUserListResult, AdminUserMutation, AdminUserRole } from "../types/admin-user";

const unavailableChange = "Chưa thể lưu thay đổi lúc này.";

/**
 * Điểm tích hợp quản lý người dùng.
 * SRS ghi nhóm `/admin/users` cho chủ cửa hàng. Đường dẫn dự kiến của ứng dụng là
 * `/api/admin/users`, nhưng Backend chưa có endpoint và chưa chốt schema JSON.
 * Hàm không gọi mạng và không đọc dữ liệu mẫu.
 * Khi API sẵn sàng, gọi đường dẫn đó bằng phiên chủ cửa hàng, map đúng JSON đã thống nhất,
 * và chỉ trả `kind: "ready"` hoặc `ok: true` khi máy chủ xác nhận. Lỗi mạng trả `error`,
 * không thay bằng dữ liệu mẫu.
 */
export async function loadAdminUsers(): Promise<AdminUserListResult> {
  return { kind: "unavailable" };
}

export async function updateAdminUserRole(id: string, role: AdminUserRole): Promise<AdminUserMutation> {
  void id;
  void role;
  return { ok: false, message: unavailableChange };
}

export async function updateAdminUserAccountStatus(
  id: string,
  accountStatus: AdminUserAccountStatus,
): Promise<AdminUserMutation> {
  void id;
  void accountStatus;
  return { ok: false, message: unavailableChange };
}
