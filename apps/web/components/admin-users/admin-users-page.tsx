"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminUserRoleLabel, validateAdminUserRoleChange } from "../../lib/admin-user-role";
import { adminUsersTheme as theme } from "../../lib/admin-users-theme";
import { normalizeSearch } from "../../lib/normalize-search";
import { loadAdminUsers, updateAdminUserAccountStatus, updateAdminUserRole } from "../../services/admin-users.service";
import type { AdminUser, AdminUserAccountStatus, AdminUserRole } from "../../types/admin-user";
import { AdminUserDetail } from "./admin-user-detail";
import { AdminUserList } from "./admin-user-list";

function ReloadIcon() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" />
      <path d="M3 21v-5h5" />
      <path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  );
}

type RoleFilter = "all" | AdminUserRole;
type CatalogPhase = "loading" | "ready" | "unavailable" | "error";
type PendingRoleChange = { user: AdminUser; role: AdminUserRole };
type PendingAccountStatusChange = { user: AdminUser; accountStatus: AdminUserAccountStatus };
type PendingChange = PendingRoleChange | PendingAccountStatusChange;

export function AdminUsersPage() {
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<CatalogPhase>("loading");
  const [error, setError] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<RoleFilter>("all");
  const [viewing, setViewing] = useState<AdminUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState<PendingChange | null>(null);

  useEffect(() => {
    let active = true;
    loadAdminUsers()
      .then((result) => {
        if (!active) return;
        if (result.kind === "ready") {
          setUsers(result.users);
          setPhase("ready");
          setError("");
          return;
        }
        setUsers([]);
        setViewing(null);
        setPending(null);
        setPhase(result.kind);
        setError(result.kind === "error" ? "Không tải được danh sách người dùng. Vui lòng thử lại." : "");
      })
      .catch(() => {
        if (!active) return;
        setUsers([]);
        setViewing(null);
        setPending(null);
        setPhase("error");
        setError("Không tải được danh sách người dùng. Vui lòng thử lại.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  const visibleUsers = users.filter((user) => {
    const haystack = normalizeSearch(`${user.fullName} ${user.phone ?? ""} ${user.id}`);
    const matchesQuery = haystack.includes(normalizeSearch(query));
    const matchesFilter = filter === "all" || user.role === filter;
    return matchesQuery && matchesFilter;
  });

  function requestRoleChange(user: AdminUser, role: AdminUserRole) {
    const invalid = validateAdminUserRoleChange(user, role);
    if (invalid) {
      setFormError(invalid);
      setPending(null);
      return;
    }
    setFormError("");
    setPending({ user, role });
  }

  function requestAccountStatusChange(user: AdminUser, accountStatus: AdminUserAccountStatus) {
    if (user.isCurrentActor || user.accountStatus === null) return;
    setFormError("");
    setPending({ user, accountStatus });
  }

  async function confirmChange() {
    if (!pending) return;
    setSaving(true);
    setFormError("");
    try {
      const result = "role" in pending
        ? await updateAdminUserRole(pending.user.id, pending.role)
        : await updateAdminUserAccountStatus(pending.user.id, pending.accountStatus);
      if (!result.ok) {
        setFormError(result.message);
        return;
      }
      const expectedStatus = "accountStatus" in pending ? pending.accountStatus : result.user.accountStatus;
      if (result.user.id !== pending.user.id
        || ("accountStatus" in pending && result.user.accountStatus !== expectedStatus)
        || ("role" in pending && result.user.role !== pending.role)) {
        setFormError("Máy chủ trả về dữ liệu thay đổi không hợp lệ.");
        return;
      }
      setUsers((current) => current.map((item) => item.id === result.user.id ? result.user : item));
      setViewing((current) => current?.id === result.user.id ? result.user : current);
      setPending(null);
    } catch {
      setFormError("Không lưu được thay đổi. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className={theme.page}>
      <div className={theme.wrap}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/" className={theme.textLink}>Về trang chủ</Link>
            <h1 className={`mt-3 ${theme.title}`}>Người dùng</h1>
            <p className={theme.muted}>Xem tài khoản và đổi vai trò Khách, Nhân viên hoặc Quản lý cửa hàng.</p>
          </div>
          <button
            type="button"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#DED3C8] bg-white text-[#67432D] hover:bg-[#F8F5F0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#67432D] disabled:cursor-not-allowed disabled:text-[#C9B8A8]"
            disabled={loading}
            aria-label="Tải lại danh sách người dùng"
            title="Tải lại danh sách người dùng"
            onClick={() => { setError(""); setFormError(""); setPending(null); setLoading(true); setAttempt((value) => value + 1); }}
          >
            <ReloadIcon />
          </button>
        </div>

        {loading && <p role="status" className={theme.panel}>Đang tải người dùng...</p>}
        {!loading && phase === "unavailable" && (
          <section className={theme.panel}>
            <p role="status">Chưa kết nối dữ liệu người dùng.</p>
            <p className={theme.muted}>Đổi vai trò chỉ thực hiện khi máy chủ xác nhận.</p>
          </section>
        )}
        {!loading && phase === "error" && (
          <section className={theme.panel}>
            <p role="alert" className={theme.alert}>{error}</p>
          </section>
        )}

        {!loading && phase === "ready" && (
          <>
            <div className={theme.panel}>
              <label htmlFor="admin-user-search" className="text-sm font-medium">Tìm theo tên, số điện thoại hoặc ID</label>
              <input id="admin-user-search" value={query} onChange={(event) => setQuery(event.target.value)} className={`${theme.input} mt-2`} placeholder="Nhập tên, số hoặc ID" />
              <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Lọc vai trò">
                {([
                  ["all", "Tất cả"],
                  ["CUSTOMER", "Khách"],
                  ["STAFF", "Nhân viên"],
                  ["MANAGER", "Quản lý cửa hàng"],
                ] as const).map(([value, label]) => (
                  <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`${theme.filter} ${filter === value ? theme.filterOn : "bg-white"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {formError && <p role="alert" className={theme.alert}>{formError}</p>}
            {pending && (
              <section className={theme.panel} aria-label="Xác nhận thao tác">
                <p>{"role" in pending
                  ? `Đổi vai trò của ${pending.user.fullName} thành ${adminUserRoleLabel(pending.role)}?`
                  : `${pending.accountStatus === "DISABLED" ? "Vô hiệu hóa" : "Kích hoạt lại"} tài khoản của ${pending.user.fullName}?`}</p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <button type="button" className={theme.primary} disabled={saving} onClick={() => { void confirmChange(); }}>
                    {saving ? "Đang lưu..." : "Xác nhận"}
                  </button>
                  <button type="button" className={theme.secondary} disabled={saving} onClick={() => setPending(null)}>Quay lại</button>
                </div>
              </section>
            )}
            {viewing && (
              <AdminUserDetail
                key={`${viewing.id}-${viewing.role}`}
                user={viewing}
                onClose={() => { setViewing(null); setPending(null); }}
                onRequestRoleChange={requestRoleChange}
                onRequestAccountStatusChange={requestAccountStatusChange}
              />
            )}
            {visibleUsers.length === 0 ? (
              <p className={theme.panel}>Không có người dùng phù hợp.</p>
            ) : (
              <AdminUserList users={visibleUsers} onView={(user) => { setViewing(user); setPending(null); setFormError(""); }} />
            )}
          </>
        )}
      </div>
    </main>
  );
}
