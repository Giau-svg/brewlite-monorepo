/** Vai trò trong SRS: CUSTOMER, STAFF, MANAGER. */
export type AdminUserRole = "CUSTOMER" | "STAFF" | "MANAGER";

/** Trạng thái tài khoản chỉ hiện khi API đã cung cấp. */
export type AdminUserAccountStatus = "ACTIVE" | "DISABLED";

export type AdminUser = {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  role: AdminUserRole;
  accountStatus: AdminUserAccountStatus | null;
  isCurrentActor: boolean;
};

export type AdminUserListResult =
  | { kind: "ready"; users: AdminUser[] }
  | { kind: "unavailable" }
  | { kind: "error" };

export type AdminUserMutation =
  | { ok: true; user: AdminUser }
  | { ok: false; message: string };
