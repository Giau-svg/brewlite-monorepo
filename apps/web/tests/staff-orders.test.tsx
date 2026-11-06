import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { StaffOrdersPage } from "../components/staff-orders/staff-orders-page";
import { canAdvanceStaffOrder, nextStaffStatus } from "../lib/staff-order-flow";
import { parseStaffBoard } from "../lib/parse-staff-orders";
import { loadStaffOrders, updateStaffOrderStatus } from "../services/staff-orders.service";
import type { StaffOrder, StaffUpdateResult } from "../types/staff-order";

vi.mock("../services/staff-orders.service", async () => {
  const actual = await vi.importActual<typeof import("../services/staff-orders.service")>(
    "../services/staff-orders.service",
  );
  return {
    loadStaffOrders: vi.fn(actual.loadStaffOrders),
    updateStaffOrderStatus: vi.fn(actual.updateStaffOrderStatus),
  };
});

function sample(overrides: Partial<StaffOrder> = {}): StaffOrder {
  return {
    id: "order-1",
    orderCode: "BL26001",
    status: "PAID",
    placedAt: "2026-11-07T02:00:00.000Z",
    items: [{
      name: "Cà phê sữa",
      quantity: 1,
      sizeName: "Size M",
      note: "ít đá",
      toppings: ["Trân châu"],
    }],
    finalTotal: 45000,
    ...overrides,
  };
}

beforeEach(async () => {
  const actual = await vi.importActual<typeof import("../services/staff-orders.service")>(
    "../services/staff-orders.service",
  );
  vi.mocked(loadStaffOrders).mockImplementation(actual.loadStaffOrders);
  vi.mocked(updateStaffOrderStatus).mockImplementation(actual.updateStaffOrderStatus);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("staff order flow", () => {
  it("allows only the next status and blocks skips or reversals", () => {
    expect(nextStaffStatus("PAID")).toBe("PREPARING");
    expect(nextStaffStatus("PREPARING")).toBe("READY");
    expect(nextStaffStatus("READY")).toBe("COMPLETED");
    expect(nextStaffStatus("COMPLETED")).toBeNull();
    expect(canAdvanceStaffOrder("PAID", "PREPARING")).toBe(true);
    expect(canAdvanceStaffOrder("PAID", "READY")).toBe(false);
    expect(canAdvanceStaffOrder("READY", "PREPARING")).toBe(false);
    expect(canAdvanceStaffOrder("COMPLETED", "READY")).toBe(false);
  });

  it("keeps only paid operational orders and does not grant update rights by default", () => {
    const board = parseStaffBoard({
      orders: [
        { id: "a", orderCode: "BL1", status: "PAID", items: [] },
        { id: "b", orderCode: "BL2", status: "PENDING_PAYMENT", items: [] },
        { id: "c", orderCode: "BL3", status: "CANCELLED", items: [] },
      ],
    });
    expect(board.kind).toBe("ready");
    if (board.kind === "ready") {
      expect(board.orders.map((order) => order.orderCode)).toEqual(["BL1"]);
      expect(board.canUpdate).toBe(false);
    }
  });
});

describe("staff orders page", () => {
  it("shows that orders cannot be loaded and does not invent orders", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<StaffOrdersPage />);
    expect(screen.getByText("Đang tải đơn...")).toBeDefined();
    expect(await screen.findByText("Chưa thể tải đơn lúc này. Tài khoản nhân viên chưa được xác nhận.")).toBeDefined();
    expect(screen.queryByText("BL26001")).toBeNull();
    expect(screen.queryByRole("button", { name: "Bắt đầu chuẩn bị" })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows forbidden access without order actions", async () => {
    vi.mocked(loadStaffOrders).mockResolvedValue({ kind: "forbidden" });
    render(<StaffOrdersPage />);
    expect(await screen.findByText("Bạn không có quyền xem đơn.")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Bắt đầu chuẩn bị" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Thử lại" })).toBeNull();
  });

  it("shows an empty list, filters orders, and retries after an error", async () => {
    vi.mocked(loadStaffOrders).mockResolvedValueOnce({ kind: "error" });
    render(<StaffOrdersPage />);
    expect(await screen.findByRole("alert")).toBeDefined();
    vi.mocked(loadStaffOrders).mockResolvedValueOnce({
      kind: "ready",
      canUpdate: true,
      orders: [sample(), sample({ id: "order-2", orderCode: "BL26002", status: "READY" })],
    });
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByText("BL26001")).toBeDefined();
    expect(screen.getByText("BL26002")).toBeDefined();
    expect(screen.getAllByText("Cà phê sữa")).toHaveLength(2);
    expect(screen.getAllByText("Size: Size M")).toHaveLength(2);
    expect(screen.getAllByText("Topping: Trân châu")).toHaveLength(2);
    expect(screen.getAllByText("Số lượng: 1")).toHaveLength(2);
    expect(screen.getAllByText("Ghi chú: ít đá")).toHaveLength(2);
    expect(screen.getAllByText(/Đặt lúc/)).toHaveLength(2);
    expect(screen.getAllByText(`${(45000).toLocaleString("vi-VN")}đ`)).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Sẵn sàng" }));
    expect(screen.queryByText("BL26001")).toBeNull();
    expect(screen.getByText("BL26002")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Đã hoàn tất" }));
    expect(screen.getByText("Chưa có đơn trong mục này.")).toBeDefined();
  });

  it("does not show a successful update before the backend confirms it", async () => {
    vi.mocked(loadStaffOrders).mockResolvedValue({
      kind: "ready",
      canUpdate: true,
      orders: [sample()],
    });
    let resolveUpdate: (value: StaffUpdateResult) => void = () => {};
    vi.mocked(updateStaffOrderStatus).mockImplementation(
      () => new Promise((resolve) => {
        resolveUpdate = resolve;
      }),
    );
    render(<StaffOrdersPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Bắt đầu chuẩn bị" }));
    expect(screen.getByRole("article").textContent).toContain("Đã thanh toán");
    expect(screen.queryByText(/đã chuyển sang/)).toBeNull();
    resolveUpdate({
      accepted: true,
      order: sample({ status: "PREPARING" }),
    });
    expect(await screen.findByText("Đơn BL26001 đã chuyển sang Đang chuẩn bị.")).toBeDefined();
    expect(screen.getByRole("article").textContent).toContain("Đang chuẩn bị");
    expect(screen.getByRole("button", { name: "Đánh dấu sẵn sàng" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Đánh dấu đã giao" })).toBeNull();
  });

  it("keeps the current status when an update is refused and reloads after a conflict", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(loadStaffOrders).mockResolvedValue({
      kind: "ready",
      canUpdate: false,
      orders: [sample()],
    });
    render(<StaffOrdersPage />);
    expect(await screen.findByText("Chưa thể chuyển trạng thái.")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Bắt đầu chuẩn bị" })).toBeNull();
    cleanup();

    vi.mocked(loadStaffOrders)
      .mockResolvedValueOnce({ kind: "ready", canUpdate: true, orders: [sample()] })
      .mockResolvedValueOnce({
        kind: "ready",
        canUpdate: true,
        orders: [sample({ status: "PREPARING" })],
      });
    vi.mocked(updateStaffOrderStatus).mockResolvedValue({ accepted: false, reason: "conflict" });
    render(<StaffOrdersPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Bắt đầu chuẩn bị" }));
    expect(await screen.findByText("Đơn vừa được người khác cập nhật. Danh sách đã được tải lại.")).toBeDefined();
    expect(screen.queryByText(/đã chuyển sang/)).toBeNull();
    expect(screen.getByRole("article").textContent).toContain("Đang chuẩn bị");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
