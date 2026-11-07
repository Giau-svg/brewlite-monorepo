import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { OrdersView } from "../components/orders/orders-view";
import { getStore, sendStore } from "../services/store.service";
vi.mock("../lib/auth-store", () => ({ useAuthUser: () => ({ fullName: "Staff", role: "STAFF", loyaltyPoints: 0 }), refreshAuth: vi.fn() }));
vi.mock("../services/store.service", () => ({ getStore: vi.fn(), sendStore: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it("loads STAFF queue and submits only the next legal transition with version and request key", async () => {
  vi.mocked(getStore).mockResolvedValue([{ id: "order-id", orderCode: "BL-HTTP", status: "PAID", version: 1, finalTotal: "35000", createdAt: "2026-11-07T00:00:00Z", items: [], payments: [], history: [] }]);
  vi.mocked(sendStore).mockResolvedValue({});
  render(<OrdersView staff />);
  fireEvent.click(await screen.findByRole("button", { name: "Đang pha chế" }));
  await waitFor(() => expect(sendStore).toHaveBeenCalledWith("/staff/orders/order-id/status", { expectedVersion: 1, nextStatus: "PREPARING" }, "patch", expect.any(String)));
  expect(screen.queryByRole("button", { name: "Hoàn tất" })).toBeNull();
});
it("shows an empty state from an empty API response", async () => {
  vi.mocked(getStore).mockResolvedValue([]); render(<OrdersView />);
  expect(await screen.findByText("Chưa có đơn hàng phù hợp.")).toBeTruthy();
});