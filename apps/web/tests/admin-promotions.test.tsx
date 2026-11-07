import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { AdminPromotionsPage } from "../components/admin-promotions/admin-promotions-page";
import {
  createAdminPromotion,
  loadAdminPromotions,
  setAdminPromotionActive,
  updateAdminPromotion,
} from "../services/admin-promotions.service";
import type { AdminPromotion } from "../types/admin-promotion";

vi.mock("../services/admin-promotions.service", async () => {
  const actual = await vi.importActual<typeof import("../services/admin-promotions.service")>(
    "../services/admin-promotions.service",
  );
  return {
    ...actual,
    loadAdminPromotions: vi.fn(actual.loadAdminPromotions),
    createAdminPromotion: vi.fn(actual.createAdminPromotion),
    updateAdminPromotion: vi.fn(actual.updateAdminPromotion),
    setAdminPromotionActive: vi.fn(actual.setAdminPromotionActive),
  };
});

const activePromotion: AdminPromotion = {
  id: "promo-gold",
  code: "GIAM10",
  name: "Giảm giờ vàng",
  discountType: "PERCENTAGE",
  discountValue: 10,
  minOrderValue: 50000,
  maxDiscount: 20000,
  startsAt: "2026-11-01T01:00:00.000Z",
  endsAt: "2026-12-01T01:00:00.000Z",
  usageLimit: 100,
  usedCount: 3,
  isActive: true,
};

const inactivePromotion: AdminPromotion = {
  id: "promo-tet",
  code: "TET",
  name: "Ưu đãi Tết",
  discountType: "FIXED_AMOUNT",
  discountValue: 15000,
  minOrderValue: 80000,
  maxDiscount: null,
  startsAt: "2026-01-01T01:00:00.000Z",
  endsAt: "2026-02-01T01:00:00.000Z",
  usageLimit: 20,
  usedCount: 0,
  isActive: false,
};

async function actualService() {
  return vi.importActual<typeof import("../services/admin-promotions.service")>(
    "../services/admin-promotions.service",
  );
}

beforeEach(async () => {
  const actual = await actualService();
  vi.mocked(loadAdminPromotions).mockImplementation(actual.loadAdminPromotions);
  vi.mocked(createAdminPromotion).mockImplementation(actual.createAdminPromotion);
  vi.mocked(updateAdminPromotion).mockImplementation(actual.updateAdminPromotion);
  vi.mocked(setAdminPromotionActive).mockImplementation(actual.setAdminPromotionActive);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function showReadyCatalog() {
  vi.mocked(loadAdminPromotions).mockResolvedValue({
    kind: "ready",
    promotions: [activePromotion, inactivePromotion],
  });
}

function fillValidDraft() {
  fireEvent.change(screen.getByLabelText("Mã khuyến mãi"), { target: { value: "TET25" } });
  fireEvent.change(screen.getByLabelText("Tên khuyến mãi"), { target: { value: "Tết 2025" } });
  fireEvent.change(screen.getByLabelText("Phần trăm giảm"), { target: { value: "10" } });
  fireEvent.change(screen.getByLabelText("Giá trị đơn tối thiểu (đ)"), { target: { value: "50000" } });
  fireEvent.change(screen.getByLabelText("Thời gian bắt đầu"), { target: { value: "2026-11-01T08:00" } });
  fireEvent.change(screen.getByLabelText("Thời gian kết thúc"), { target: { value: "2026-12-01T08:00" } });
}

describe("admin promotions", () => {
  it("returns unavailable from the app service and does not call fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const actual = await actualService();
    expect(await actual.loadAdminPromotions()).toEqual({ kind: "unavailable" });
    const created = await actual.createAdminPromotion({
      code: "TET25",
      name: "Tết 2025",
      discountType: "PERCENTAGE",
      discountValue: 10,
      minOrderValue: 0,
      maxDiscount: null,
      startsAt: "2026-11-01T08:00",
      endsAt: "2026-12-01T08:00",
      usageLimit: 1,
      isActive: true,
    });
    expect(created.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the disconnected state and hides sample promotions", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminPromotionsPage />);
    expect(screen.getByText("Đang tải khuyến mãi...")).toBeDefined();
    expect(await screen.findByText("Chưa kết nối dữ liệu khuyến mãi.")).toBeDefined();
    expect(screen.queryByRole("heading", { name: "GIAM10" })).toBeNull();
    expect(screen.queryByText(/dữ liệu minh họa/)).toBeNull();
    expect((screen.getByRole("button", { name: "Thêm khuyến mãi" }) as HTMLButtonElement).disabled).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows an error and does not fall back to sample promotions", async () => {
    vi.mocked(loadAdminPromotions)
      .mockRejectedValueOnce(new Error("down"))
      .mockResolvedValueOnce({ kind: "unavailable" });
    render(<AdminPromotionsPage />);
    expect((await screen.findByRole("alert")).textContent).toContain("Không tải được danh sách khuyến mãi");
    expect(screen.queryByRole("heading", { name: "GIAM10" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Tải lại danh sách khuyến mãi" }));
    expect(await screen.findByText("Chưa kết nối dữ liệu khuyến mãi.")).toBeDefined();
    expect(screen.queryByRole("heading", { name: "GIAM10" })).toBeNull();
  });

  it("shows loading while the promotion request is pending", () => {
    vi.mocked(loadAdminPromotions).mockImplementation(() => new Promise(() => {}));
    render(<AdminPromotionsPage />);
    expect(screen.getByText("Đang tải khuyến mãi...")).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByText("Chưa kết nối dữ liệu khuyến mãi.")).toBeNull();
  });

  it("shows an empty ready catalog", async () => {
    vi.mocked(loadAdminPromotions).mockResolvedValue({ kind: "ready", promotions: [] });
    render(<AdminPromotionsPage />);
    expect(await screen.findByText("Không có khuyến mãi phù hợp.")).toBeDefined();
    expect((screen.getByRole("button", { name: "Thêm khuyến mãi" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("searches by code or name and filters inactive promotions", async () => {
    showReadyCatalog();
    render(<AdminPromotionsPage />);
    await screen.findByRole("heading", { name: "GIAM10" });
    fireEvent.change(screen.getByLabelText("Tìm theo mã hoặc tên"), { target: { value: "gio vang" } });
    expect(screen.getByRole("heading", { name: "GIAM10" })).toBeDefined();
    expect(screen.queryByRole("heading", { name: "TET" })).toBeNull();
    fireEvent.change(screen.getByLabelText("Tìm theo mã hoặc tên"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Đang tắt" }));
    expect(screen.getByRole("heading", { name: "TET" })).toBeDefined();
    expect(screen.queryByRole("heading", { name: "GIAM10" })).toBeNull();
  });

  it("shows promotion details from a ready catalog", async () => {
    showReadyCatalog();
    render(<AdminPromotionsPage />);
    const card = (await screen.findByRole("heading", { name: "GIAM10" })).closest("article");
    if (!card) throw new Error("missing promotion card");
    fireEvent.click(within(card).getByRole("button", { name: "Xem chi tiết" }));
    const detail = screen.getByRole("region", { name: "Chi tiết GIAM10" });
    expect(within(detail).getByText("Giảm giờ vàng")).toBeDefined();
    expect(within(detail).getByText("10%")).toBeDefined();
    expect(within(detail).getByText("20.000đ")).toBeDefined();
    expect(within(detail).getByText("Đã dùng 3 / 100")).toBeDefined();
  });

  it("keeps the form open when the draft is invalid", async () => {
    showReadyCatalog();
    render(<AdminPromotionsPage />);
    await screen.findByRole("heading", { name: "GIAM10" });
    fireEvent.click(screen.getByRole("button", { name: "Thêm khuyến mãi" }));
    fireEvent.change(screen.getByLabelText("Mã khuyến mãi"), { target: { value: "TET25" } });
    fireEvent.change(screen.getByLabelText("Tên khuyến mãi"), { target: { value: "Tết 2025" } });
    fireEvent.change(screen.getByLabelText("Phần trăm giảm"), { target: { value: "60" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu khuyến mãi" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Phần trăm giảm phải là số nguyên từ 1 đến 50.");
    expect(screen.queryByText("Xác nhận lưu khuyến mãi?")).toBeNull();
    expect(createAdminPromotion).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Phần trăm giảm"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("Thời gian bắt đầu"), { target: { value: "2026-12-01T08:00" } });
    fireEvent.change(screen.getByLabelText("Thời gian kết thúc"), { target: { value: "2026-11-01T08:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu khuyến mãi" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Thời gian bắt đầu phải trước thời gian kết thúc.");

    fireEvent.change(screen.getByLabelText("Thời gian kết thúc"), { target: { value: "2026-12-02T08:00" } });
    fireEvent.change(screen.getByLabelText("Giới hạn lượt sử dụng"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu khuyến mãi" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Giới hạn lượt sử dụng phải là số nguyên từ 1 trở lên.");
  });

  it("does not record a promotion when the server has not confirmed", async () => {
    showReadyCatalog();
    render(<AdminPromotionsPage />);
    await screen.findByRole("heading", { name: "GIAM10" });
    fireEvent.click(screen.getByRole("button", { name: "Thêm khuyến mãi" }));
    fillValidDraft();
    fireEvent.click(screen.getByRole("button", { name: "Lưu khuyến mãi" }));
    expect(screen.getByText("Xác nhận lưu khuyến mãi?")).toBeDefined();
    expect(createAdminPromotion).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Quay lại" }));
    expect(createAdminPromotion).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Lưu khuyến mãi" }));
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Chưa thể lưu thay đổi lúc này.");
    expect(screen.queryByRole("heading", { name: "TET25" })).toBeNull();

    const card = screen.getByRole("heading", { name: "GIAM10" }).closest("article");
    if (!card) throw new Error("missing promotion card");
    fireEvent.click(within(card).getByRole("button", { name: "Tắt" }));
    expect(screen.getByText("Tắt mã GIAM10?")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Chưa thể lưu thay đổi lúc này.");
    expect(within(card).getByText("Đang bật")).toBeDefined();
  });

  it("shows a promotion only after the service confirms it", async () => {
    showReadyCatalog();
    const confirmed: AdminPromotion = {
      ...activePromotion,
      id: "promo-tet25",
      code: "TET25",
      name: "Tết 2025",
      isActive: false,
    };
    vi.mocked(createAdminPromotion).mockResolvedValue({ ok: true, promotion: confirmed });
    vi.mocked(setAdminPromotionActive).mockResolvedValue({
      ok: true,
      promotion: { ...activePromotion, isActive: false },
    });
    render(<AdminPromotionsPage />);
    await screen.findByRole("heading", { name: "GIAM10" });
    fireEvent.click(screen.getByRole("button", { name: "Thêm khuyến mãi" }));
    fillValidDraft();
    fireEvent.click(screen.getByLabelText("Đang kích hoạt"));
    fireEvent.click(screen.getByRole("button", { name: "Lưu khuyến mãi" }));
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận" }));
    expect(await screen.findByRole("heading", { name: "TET25" })).toBeDefined();

    const card = screen.getByRole("heading", { name: "GIAM10" }).closest("article");
    if (!card) throw new Error("missing promotion card");
    fireEvent.click(within(card).getByRole("button", { name: "Tắt" }));
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận" }));
    expect(await within(card).findByText("Đang tắt")).toBeDefined();
    expect(within(card).getByRole("button", { name: "Bật" })).toBeDefined();
  });
});
