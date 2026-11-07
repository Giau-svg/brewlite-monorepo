import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { AdminUsersPage } from "../components/admin-users/admin-users-page";
import { loadAdminUsers, updateAdminUserAccountStatus, updateAdminUserRole } from "../services/admin-users.service";
import type { AdminUser } from "../types/admin-user";

vi.mock("../services/admin-users.service", async () => {
  const actual = await vi.importActual<typeof import("../services/admin-users.service")>(
    "../services/admin-users.service",
  );
  return {
    ...actual,
    loadAdminUsers: vi.fn(actual.loadAdminUsers),
    updateAdminUserRole: vi.fn(actual.updateAdminUserRole),
    updateAdminUserAccountStatus: vi.fn(actual.updateAdminUserAccountStatus),
  };
});

const customer: AdminUser = {
  id: "user-lan",
  fullName: "Lan Phạm",
  phone: "0901234567",
  email: "lan@brewlite.example",
  role: "CUSTOMER",
  accountStatus: "ACTIVE",
  isCurrentActor: false,
};

const staff: AdminUser = {
  id: "user-minh",
  fullName: "Minh Trần",
  phone: "0912345678",
  email: null,
  role: "STAFF",
  accountStatus: "DISABLED",
  isCurrentActor: false,
};

const manager: AdminUser = {
  id: "user-manager",
  fullName: "Quản lý cửa hàng",
  phone: "0988888888",
  email: "manager@brewlite.example",
  role: "MANAGER",
  accountStatus: "ACTIVE",
  isCurrentActor: true,
};

async function actualService() {
  return vi.importActual<typeof import("../services/admin-users.service")>(
    "../services/admin-users.service",
  );
}

beforeEach(async () => {
  const actual = await actualService();
  vi.mocked(loadAdminUsers).mockImplementation(actual.loadAdminUsers);
  vi.mocked(updateAdminUserRole).mockImplementation(actual.updateAdminUserRole);
  vi.mocked(updateAdminUserAccountStatus).mockImplementation(actual.updateAdminUserAccountStatus);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function showReadyUsers() {
  vi.mocked(loadAdminUsers).mockResolvedValue({
    kind: "ready",
    users: [customer, staff, manager],
  });
}

describe("admin users", () => {
  it("returns unavailable from the app service and does not call fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const actual = await actualService();
    expect(await actual.loadAdminUsers()).toEqual({ kind: "unavailable" });
    const changed = await actual.updateAdminUserRole("user-lan", "STAFF");
    expect(changed.ok).toBe(false);
    const statusChanged = await actual.updateAdminUserAccountStatus("user-lan", "DISABLED");
    expect(statusChanged.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the disconnected state and hides sample users", async () => {
    render(<AdminUsersPage />);
    expect(screen.getByText("Đang tải người dùng...")).toBeDefined();
    expect(await screen.findByText("Chưa kết nối dữ liệu người dùng.")).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Lan Phạm" })).toBeNull();
    expect(screen.queryByText("0901234567")).toBeNull();
    expect(screen.queryByText(/mật khẩu|OTP|JWT/i)).toBeNull();
  });

  it("shows an error and does not fall back to sample users", async () => {
    vi.mocked(loadAdminUsers)
      .mockRejectedValueOnce(new Error("down"))
      .mockResolvedValueOnce({ kind: "unavailable" });
    render(<AdminUsersPage />);
    expect((await screen.findByRole("alert")).textContent).toContain("Không tải được danh sách người dùng");
    expect(screen.queryByRole("heading", { name: "Lan Phạm" })).toBeNull();
    fireEvent.click(screen.getByRole("button", {
      name: "Tải lại danh sách người dùng",
    }));
    expect(await screen.findByText("Chưa kết nối dữ liệu người dùng.")).toBeDefined();
    expect(screen.queryByText("0901234567")).toBeNull();
  });

  it("shows loading while the user request is pending", () => {
    vi.mocked(loadAdminUsers).mockImplementation(() => new Promise(() => {}));
    render(<AdminUsersPage />);
    expect(screen.getByText("Đang tải người dùng...")).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByText("Chưa kết nối dữ liệu người dùng.")).toBeNull();
  });

  it("shows an empty ready catalog", async () => {
    vi.mocked(loadAdminUsers).mockResolvedValue({ kind: "ready", users: [] });
    render(<AdminUsersPage />);
    expect(await screen.findByText("Không có người dùng phù hợp.")).toBeDefined();
  });

  it("searches by name, phone, or id and filters by role", async () => {
    showReadyUsers();
    render(<AdminUsersPage />);
    await screen.findByRole("heading", { name: "Lan Phạm" });
    fireEvent.change(screen.getByLabelText("Tìm theo tên, số điện thoại hoặc ID"), { target: { value: "0901234567" } });
    expect(screen.getByRole("heading", { name: "Lan Phạm" })).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Minh Trần" })).toBeNull();
    fireEvent.change(screen.getByLabelText("Tìm theo tên, số điện thoại hoặc ID"), { target: { value: "user-minh" } });
    expect(screen.getByRole("heading", { name: "Minh Trần" })).toBeDefined();
    fireEvent.change(screen.getByLabelText("Tìm theo tên, số điện thoại hoặc ID"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Nhân viên" }));
    expect(screen.getByRole("heading", { name: "Minh Trần" })).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Lan Phạm" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Chủ quán" })).toBeNull();
  });

  it("shows account details without sensitive fields", async () => {
    showReadyUsers();
    render(<AdminUsersPage />);
    const card = (await screen.findByRole("heading", { name: "Lan Phạm" })).closest("article");
    if (!card) throw new Error("missing user card");
    fireEvent.click(within(card).getByRole("button", { name: "Xem chi tiết" }));
    const detail = screen.getByRole("region", { name: "Chi tiết Lan Phạm" });
    expect(within(detail).getByText("user-lan")).toBeDefined();
    expect(within(detail).getByText("0901234567")).toBeDefined();
    expect(within(detail).getByText("lan@brewlite.example")).toBeDefined();
    expect(within(detail).getByText("Khách (CUSTOMER)")).toBeDefined();
    expect(within(detail).getByText("Đang hoạt động")).toBeDefined();
    expect(detail.textContent).not.toMatch(/mật khẩu|OTP|JWT|password|token/i);
  });

  it("shows the account status action for active and disabled users", async () => {
    showReadyUsers();
    render(<AdminUsersPage />);
    const activeCard = (await screen.findByRole("heading", { name: "Lan Phạm" })).closest("article");
    const disabledCard = screen.getByRole("heading", { name: "Minh Trần" }).closest("article");
    if (!activeCard || !disabledCard) throw new Error("missing user card");
    fireEvent.click(within(activeCard).getByRole("button", { name: "Xem chi tiết" }));
    expect(screen.getByRole("button", { name: "Vô hiệu hóa tài khoản" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Đóng" }));
    fireEvent.click(within(disabledCard).getByRole("button", { name: "Xem chi tiết" }));
    expect(screen.getByRole("button", { name: "Kích hoạt lại tài khoản" })).toBeDefined();
  });

  it("hides the account status action for null status and the current actor", async () => {
    showReadyUsers();
    vi.mocked(loadAdminUsers).mockResolvedValue({
      kind: "ready",
      users: [{ ...customer, accountStatus: null }, manager],
    });
    render(<AdminUsersPage />);
    const card = (await screen.findByRole("heading", { name: "Lan Phạm" })).closest("article");
    if (!card) throw new Error("missing user card");
    fireEvent.click(within(card).getByRole("button", { name: "Xem chi tiết" }));
    expect(screen.queryByRole("button", { name: /tài khoản/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Đóng" }));
    const actorCard = screen.getByRole("heading", { name: "Quản lý cửa hàng" }).closest("article");
    if (!actorCard) throw new Error("missing actor card");
    fireEvent.click(within(actorCard).getByRole("button", { name: "Xem chi tiết" }));
    expect(screen.queryByRole("button", { name: /tài khoản/ })).toBeNull();
  });

  it("requires confirmation before changing account status", async () => {
    showReadyUsers();
    render(<AdminUsersPage />);
    const card = (await screen.findByRole("heading", { name: "Lan Phạm" })).closest("article");
    if (!card) throw new Error("missing user card");
    fireEvent.click(within(card).getByRole("button", { name: "Xem chi tiết" }));
    fireEvent.click(screen.getByRole("button", { name: "Vô hiệu hóa tài khoản" }));
    expect(screen.getByText("Vô hiệu hóa tài khoản của Lan Phạm?")).toBeDefined();
    expect(updateAdminUserAccountStatus).not.toHaveBeenCalled();
  });

  it("does not change account status when the service rejects", async () => {
    showReadyUsers();
    vi.mocked(updateAdminUserAccountStatus).mockResolvedValue({ ok: false, message: "Không thể thay đổi." });
    render(<AdminUsersPage />);
    const card = (await screen.findByRole("heading", { name: "Lan Phạm" })).closest("article");
    if (!card) throw new Error("missing user card");
    fireEvent.click(within(card).getByRole("button", { name: "Xem chi tiết" }));
    fireEvent.click(screen.getByRole("button", { name: "Vô hiệu hóa tài khoản" }));
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Không thể thay đổi.");
    expect(within(screen.getByRole("region", { name: "Chi tiết Lan Phạm" })).getByRole("button", { name: "Vô hiệu hóa tài khoản" })).toBeDefined();
  });

  it("updates only the matching account after a valid status response", async () => {
    showReadyUsers();
    vi.mocked(updateAdminUserAccountStatus).mockResolvedValue({
      ok: true,
      user: { ...customer, accountStatus: "DISABLED" },
    });
    render(<AdminUsersPage />);
    const card = (await screen.findByRole("heading", { name: "Lan Phạm" })).closest("article");
    if (!card) throw new Error("missing user card");
    fireEvent.click(within(card).getByRole("button", { name: "Xem chi tiết" }));
    fireEvent.click(screen.getByRole("button", { name: "Vô hiệu hóa tài khoản" }));
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận" }));
    expect(await screen.findByRole("button", { name: "Kích hoạt lại tài khoản" })).toBeDefined();
  });

  it("rejects status responses with a wrong id or status", async () => {
    showReadyUsers();
    vi.mocked(updateAdminUserAccountStatus).mockResolvedValue({
      ok: true,
      user: { ...customer, id: "other-user", accountStatus: "DISABLED" },
    });
    render(<AdminUsersPage />);
    const card = (await screen.findByRole("heading", { name: "Lan Phạm" })).closest("article");
    if (!card) throw new Error("missing user card");
    fireEvent.click(within(card).getByRole("button", { name: "Xem chi tiết" }));
    fireEvent.click(screen.getByRole("button", { name: "Vô hiệu hóa tài khoản" }));
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận" }));
    expect((await screen.findByRole("alert")).textContent).toContain("không hợp lệ");
    expect(within(screen.getByRole("region", { name: "Chi tiết Lan Phạm" })).getByRole("button", { name: "Vô hiệu hóa tài khoản" })).toBeDefined();
  });

  it("does not change a role before the server confirms", async () => {
    showReadyUsers();
    render(<AdminUsersPage />);
    const card = (await screen.findByRole("heading", { name: "Lan Phạm" })).closest("article");
    if (!card) throw new Error("missing user card");
    fireEvent.click(within(card).getByRole("button", { name: "Xem chi tiết" }));
    fireEvent.change(screen.getByLabelText("Vai trò mới"), { target: { value: "STAFF" } });
    fireEvent.click(screen.getByRole("button", { name: "Đổi vai trò" }));
    expect(screen.getByText("Đổi vai trò của Lan Phạm thành Nhân viên?")).toBeDefined();
    expect(updateAdminUserRole).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Quay lại" }));
    expect(updateAdminUserRole).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Đổi vai trò" }));
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Chưa thể lưu thay đổi lúc này.");
    expect(within(card).getByText("Khách")).toBeDefined();
  });

  it("blocks a role change for the signed-in account", async () => {
    showReadyUsers();
    render(<AdminUsersPage />);
    const card = (await screen.findByRole("heading", { name: "Quản lý cửa hàng" })).closest("article");
    if (!card) throw new Error("missing user card");
    fireEvent.click(within(card).getByRole("button", { name: "Xem chi tiết" }));
    expect(screen.getByText("Chưa xác nhận chính sách đổi vai trò của chính tài khoản này.")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Đổi vai trò" })).toBeNull();
    expect(updateAdminUserRole).not.toHaveBeenCalled();
  });

  it("shows the new role only after the service confirms it", async () => {
    showReadyUsers();
    vi.mocked(updateAdminUserRole).mockResolvedValue({
      ok: true,
      user: { ...customer, role: "STAFF" },
    });
    render(<AdminUsersPage />);
    const card = (await screen.findByRole("heading", { name: "Lan Phạm" })).closest("article");
    if (!card) throw new Error("missing user card");
    fireEvent.click(within(card).getByRole("button", { name: "Xem chi tiết" }));
    fireEvent.change(screen.getByLabelText("Vai trò mới"), { target: { value: "STAFF" } });
    fireEvent.click(screen.getByRole("button", { name: "Đổi vai trò" }));
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận" }));
    expect(await within(card).findByText("Nhân viên")).toBeDefined();
  });
});
