import type { AdminUser, AdminUserRole } from "../types/admin-user";

export const adminUserRoles: readonly AdminUserRole[] = ["CUSTOMER", "STAFF", "MANAGER"];

const labels: Record<AdminUserRole, string> = {
  CUSTOMER: "Khách",
  STAFF: "Nhân viên",
  MANAGER: "Quản lý cửa hàng",
};

export function adminUserRoleLabel(role: AdminUserRole): string {
  return labels[role];
}

export function validateAdminUserRoleChange(user: AdminUser, role: AdminUserRole): string | null {
  if (user.isCurrentActor) return "Chưa xác nhận chính sách đổi vai trò của chính tài khoản này.";
  if (!adminUserRoles.includes(role)) return "Vai trò không nằm trong danh sách được phép.";
  if (user.role === role) return "Vai trò này đang được gán.";
  return null;
}
