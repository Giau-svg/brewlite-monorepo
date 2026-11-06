import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { OrderTrackingPage } from "../components/order-tracking/order-tracking-page";
import { parseTrackedOrder } from "../lib/parse-tracked-order";
import { loadTrackedOrder } from "../services/order-tracking.service";
import type { TrackedOrder } from "../types/order-tracking";

vi.mock("../services/order-tracking.service", async () => {
  const actual = await vi.importActual<typeof import("../services/order-tracking.service")>(
    "../services/order-tracking.service",
  );
  return { loadTrackedOrder: vi.fn(actual.loadTrackedOrder) };
});

function page(id: string) {
  return <OrderTrackingPage orderId={id} />;
}

function order(overrides: Partial<TrackedOrder> = {}): TrackedOrder {
  return {
    id: "order-a",
    orderCode: "BL26001",
    status: "PAID",
    items: [{
      name: "Cà phê sữa",
      quantity: 2,
      sizeName: "Size M",
      note: "ít đá",
      toppings: ["Trân châu"],
      lineTotal: 58000,
    }],
    finalTotal: 50200,
    pickupInstruction: "Đến quầy và đọc mã đơn.",
    ...overrides,
  };
}

beforeEach(async () => {
  const actual = await vi.importActual<typeof import("../services/order-tracking.service")>(
    "../services/order-tracking.service",
  );
  vi.mocked(loadTrackedOrder).mockImplementation(actual.loadTrackedOrder);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("tracked order parser", () => {
  it("rejects a payload whose order id does not match the requested id", () => {
    const result = parseTrackedOrder({
      id: "order-b",
      orderCode: "BL-SECRET",
      status: "READY",
      items: [{ productName: "Bí mật", quantity: 1 }],
      finalTotal: 10000,
    }, "order-a");
    expect(result.kind).toBe("forbidden");
    expect(JSON.stringify(result)).not.toContain("BL-SECRET");
  });
});

describe("order tracking page", () => {
  it("shows a friendly unavailable state and does not treat the URL id as an order", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(page("order-from-url"));
    expect(screen.getByText("Đang tải đơn hàng...")).toBeDefined();
    expect(await screen.findByText("Chưa thể tải đơn hàng lúc này. Vui lòng thử lại sau.")).toBeDefined();
    expect(screen.queryByText("order-from-url")).toBeNull();
    expect(screen.queryByText("Đã thanh toán")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows missing order information for an unusable id", async () => {
    render(page(" "));
    expect(await screen.findByText("Thiếu thông tin đơn hàng.")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Thử lại" })).toBeNull();
  });

  it("shows not found, a load error with retry, and no access without order details", async () => {
    vi.mocked(loadTrackedOrder).mockResolvedValueOnce({ kind: "not-found" });
    const first = render(page("order-a"));
    expect(await screen.findByText("Không tìm thấy đơn hàng.")).toBeDefined();
    first.unmount();

    vi.mocked(loadTrackedOrder).mockRejectedValueOnce(new Error("offline"));
    render(page("order-a"));
    expect(await screen.findByRole("alert")).toBeDefined();
    vi.mocked(loadTrackedOrder).mockResolvedValueOnce({ kind: "not-found" });
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByText("Không tìm thấy đơn hàng.")).toBeDefined();
    cleanup();

    vi.mocked(loadTrackedOrder).mockResolvedValue({ kind: "forbidden" });
    render(page("order-b"));
    expect(await screen.findByText("Bạn không xem được đơn này.")).toBeDefined();
    expect(screen.queryByText("BL-SECRET")).toBeNull();
    expect(screen.queryByRole("list", { name: "Tiến độ đơn hàng" })).toBeNull();
  });

  it.each([
    ["PAID", "Đã thanh toán"],
    ["PREPARING", "Đang chuẩn bị"],
    ["READY", "Sẵn sàng"],
    ["COMPLETED", "Đã hoàn tất"],
  ] as const)("marks %s as the current fulfillment step", async (status, label) => {
    vi.mocked(loadTrackedOrder).mockResolvedValue({ kind: "order", order: order({ status }) });
    render(page("order-a"));
    const current = await screen.findByRole("listitem", { current: "step" });
    expect(current.textContent).toContain(label);
    expect(screen.getByText("BL26001")).toBeDefined();
    expect(screen.getByText("Cà phê sữa")).toBeDefined();
    expect(screen.getByText("Size: Size M")).toBeDefined();
    expect(screen.getByText("Topping: Trân châu")).toBeDefined();
    expect(screen.getByText("Số lượng: 2")).toBeDefined();
    expect(screen.getByText("Ghi chú: ít đá")).toBeDefined();
    expect(screen.getByText(`${(50200).toLocaleString("vi-VN")}đ`)).toBeDefined();
    expect(screen.getByText("Hướng dẫn nhận tại quầy: Đến quầy và đọc mã đơn.")).toBeDefined();
    expect(screen.queryByRole("button", { name: /chuẩn bị|sẵn sàng|hoàn tất/i })).toBeNull();
    cleanup();
  });

  it("keeps unpaid, cancelled, and failed payment notices off the fulfillment track", async () => {
    vi.mocked(loadTrackedOrder).mockResolvedValue({
      kind: "order",
      order: order({ status: "PENDING_PAYMENT", paymentAttempt: "FAILED", pickupInstruction: undefined }),
    });
    render(page("order-a"));
    expect(await screen.findByText("Đơn chưa được thanh toán.")).toBeDefined();
    expect(screen.getByText(/Lần thanh toán gần nhất chưa thành công/)).toBeDefined();
    expect(screen.queryByRole("list", { name: "Tiến độ đơn hàng" })).toBeNull();
    cleanup();

    vi.mocked(loadTrackedOrder).mockResolvedValue({
      kind: "order",
      order: order({ status: "PENDING_PAYMENT", paymentAttempt: "UNKNOWN" }),
    });
    render(page("order-a"));
    expect(await screen.findByText(/đang được xác minh/)).toBeDefined();
    expect(screen.queryByText(/Lần thanh toán gần nhất chưa thành công/)).toBeNull();
    cleanup();

    vi.mocked(loadTrackedOrder).mockResolvedValue({
      kind: "order",
      order: order({ status: "CANCELLED" }),
    });
    render(page("order-a"));
    expect(await screen.findByText("Đơn đã hủy.")).toBeDefined();
    expect(screen.queryByRole("list", { name: "Tiến độ đơn hàng" })).toBeNull();
  });

  it("drops the previous order when the URL id changes", async () => {
    vi.mocked(loadTrackedOrder).mockImplementation(async (id: string) => {
      if (id === "order-a") return { kind: "order", order: order() };
      return { kind: "not-found" };
    });
    const view = render(page("order-a"));
    expect(await screen.findByText("BL26001")).toBeDefined();
    view.rerender(page("order-b"));
    expect(screen.queryByText("BL26001")).toBeNull();
    expect(await screen.findByText("Không tìm thấy đơn hàng.")).toBeDefined();
    expect(screen.queryByText("order-b")).toBeNull();
  });
});
