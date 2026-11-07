import { adminUserRoleLabel } from "../../lib/admin-user-role";
import { adminUsersTheme as theme } from "../../lib/admin-users-theme";
import type { AdminUser } from "../../types/admin-user";

export function AdminUserList({
  users,
  onView,
}: {
  users: AdminUser[];
  onView: (user: AdminUser) => void;
}) {
  return (
    <div className={theme.grid}>
      {users.map((user) => (
        <article key={user.id} className={theme.panel}>
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-xl font-bold">{user.fullName}</h2>
            <p className="rounded-full bg-[#F8F5F0] px-3 py-1 text-sm text-[#67432D]">{adminUserRoleLabel(user.role)}</p>
          </div>
          <p className="mt-2 text-sm text-[#87776B]">ID: {user.id}</p>
          <p className="mt-1 text-sm">{user.phone ?? "Chưa có số điện thoại"}</p>
          {user.accountStatus && (
            <p className="mt-1 text-sm text-[#87776B]">{user.accountStatus === "ACTIVE" ? "Đang hoạt động" : "Đã vô hiệu"}</p>
          )}
          <button type="button" onClick={() => onView(user)} className={`${theme.secondary} mt-4`}>Xem chi tiết</button>
        </article>
      ))}
    </div>
  );
}
