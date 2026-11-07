import { useState } from "react";
import { adminUserRoleLabel, adminUserRoles } from "../../lib/admin-user-role";
import { adminUsersTheme as theme } from "../../lib/admin-users-theme";
import type { AdminUser, AdminUserAccountStatus, AdminUserRole } from "../../types/admin-user";

export function AdminUserDetail({
  user,
  onClose,
  onRequestRoleChange,
  onRequestAccountStatusChange,
}: {
  user: AdminUser;
  onClose: () => void;
  onRequestRoleChange: (user: AdminUser, role: AdminUserRole) => void;
  onRequestAccountStatusChange: (user: AdminUser, accountStatus: AdminUserAccountStatus) => void;
}) {
  const [role, setRole] = useState<AdminUserRole>(user.role);

  return (
    <section className={theme.panel} aria-label={`Chi tiết ${user.fullName}`}>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-bold">{user.fullName}</h2>
        <p className="rounded-full bg-[#F8F5F0] px-3 py-1 text-sm text-[#67432D]">{adminUserRoleLabel(user.role)}</p>
      </div>
      <dl className="mt-4 space-y-2 text-sm">
        <div><dt className="text-[#87776B]">ID</dt><dd>{user.id}</dd></div>
        <div><dt className="text-[#87776B]">Số điện thoại</dt><dd>{user.phone ?? "Chưa có số điện thoại"}</dd></div>
        <div><dt className="text-[#87776B]">Liên hệ</dt><dd>{user.email ?? "Chưa có email"}</dd></div>
        <div><dt className="text-[#87776B]">Vai trò</dt><dd>{adminUserRoleLabel(user.role)} ({user.role})</dd></div>
        {user.accountStatus && (
          <div><dt className="text-[#87776B]">Trạng thái tài khoản</dt><dd>{user.accountStatus === "ACTIVE" ? "Đang hoạt động" : "Đã vô hiệu"}</dd></div>
        )}
      </dl>
      {user.isCurrentActor ? (
        <p className={theme.muted}>Chưa xác nhận chính sách đổi vai trò của chính tài khoản này.</p>
      ) : (
        <>
          <form className="mt-4 space-y-3" onSubmit={(event) => { event.preventDefault(); onRequestRoleChange(user, role); }}>
            <label className="block text-sm font-medium" htmlFor="admin-user-role">Vai trò mới</label>
            <select id="admin-user-role" value={role} onChange={(event) => setRole(event.target.value as AdminUserRole)} className={theme.input}>
              {adminUserRoles.map((item) => (
                <option key={item} value={item}>{adminUserRoleLabel(item)}</option>
              ))}
            </select>
            <button type="submit" className={theme.primary}>Đổi vai trò</button>
          </form>
          {user.accountStatus && (
            <button
              type="button"
              className={theme.secondary}
              onClick={() => onRequestAccountStatusChange(user, user.accountStatus === "ACTIVE" ? "DISABLED" : "ACTIVE")}
            >
              {user.accountStatus === "ACTIVE" ? "Vô hiệu hóa tài khoản" : "Kích hoạt lại tài khoản"}
            </button>
          )}
        </>
      )}
      <button type="button" onClick={onClose} className={`${theme.secondary} mt-4`}>Đóng</button>
    </section>
  );
}
