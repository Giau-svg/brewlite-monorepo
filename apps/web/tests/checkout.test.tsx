import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CheckoutPage } from "../components/checkout/checkout-page";
import { getCheckoutIdentity } from "../lib/checkout-identity";

vi.mock("../lib/checkout-identity", () => ({
  getCheckoutIdentity: vi.fn(() => null),
  hasCheckoutIdentity: (identity: { userId?: string; sessionId?: string } | null) =>
    Boolean(identity?.userId?.trim() || identity?.sessionId?.trim()),
}));

const quoteResponse = {
  items: [
    {
      productId: "prod-1",
      productName: "Cà phê sữa",
      sizeName: "Mặc định",
      unitPrice: 29000,
      quantity: 2,
      toppings: [],
      lineTotal: 58000,
      note: "",
    },
  ],
  subtotal: 58000,
  discountAmount: 5800,
  pointsUsed: 2,
  pointsDiscount: 2000,
  finalTotal: 50200,
  appliedCoupon: { code: "WELCOME10", discountType: "PERCENTAGE", discountValue: 10 },
};

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:3001");
  vi.mocked(getCheckoutIdentity).mockReturnValue(null);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("checkout cart", () => {
  it("does not call the cart API or invent items when identity is missing", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<CheckoutPage />);
    expect(await screen.findByText("Vui lòng đăng nhập để tiếp tục thanh toán")).toBeDefined();
    expect(screen.getByRole("link", { name: "Đăng nhập" }).getAttribute("href")).toBe("/login");
    expect(screen.queryByText(/userId|sessionId|JWT|Backend/i)).toBeNull();
    expect(screen.getByRole("button", { name: "Đặt hàng" }).hasAttribute("disabled")).toBe(true);
    expect(screen.queryByText("Giỏ hàng của bạn đang trống.")).toBeNull();
    expect(screen.queryByText(/thành công/i)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows an empty cart returned by the API", async () => {
    vi.mocked(getCheckoutIdentity).mockReturnValue({ userId: "user-1" });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: null, items: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<CheckoutPage />);
    expect(await screen.findByText("Giỏ hàng của bạn đang trống.")).toBeDefined();
    expect(screen.getByRole("link", { name: "Quay lại thực đơn" }).getAttribute("href")).toBe("/#menu");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/api/cart?userId=user-1",
      expect.objectContaining({ cache: "no-store" }),
    );
    expect(screen.getByRole("button", { name: "Lấy báo giá" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Đặt hàng" }).hasAttribute("disabled")).toBe(true);
    expect(screen.queryByText(/thành công/i)).toBeNull();
  });

  it("shows an error when the cart API responds with a server error", async () => {
    vi.mocked(getCheckoutIdentity).mockReturnValue({ userId: "user-1" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ message: "Internal server error" }),
    }));
    render(<CheckoutPage />);
    expect((await screen.findByRole("alert")).textContent).toContain("Không thể kết nối");
    expect(screen.queryByText("Giỏ hàng của bạn đang trống.")).toBeNull();
  });

  it("shows an error and retries a failed cart request", async () => {
    vi.mocked(getCheckoutIdentity).mockReturnValue({ sessionId: "session-from-auth" });
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: null, items: [] }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<CheckoutPage />);
    expect((await screen.findByRole("alert")).textContent).toContain("Không thể kết nối");
    fireEvent.click(screen.getByRole("button", { name: "Thử tải lại" }));
    expect(await screen.findByText("Giỏ hàng của bạn đang trống.")).toBeDefined();
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:3001/api/cart?sessionId=session-from-auth",
      expect.anything(),
    );
  });
});

describe("checkout quote", () => {
  it("shows the official quote and does not send size or topping fields the cart did not store", async () => {
    vi.mocked(getCheckoutIdentity).mockReturnValue({ userId: "user-1" });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "cart-1",
          items: [
            {
              id: "line-1",
              productId: "prod-1",
              quantity: 2,
              note: "ít đá",
              product: { id: "prod-1", name: "Cà phê sữa", basePrice: "29000.00" },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => quoteResponse });
    vi.stubGlobal("fetch", fetchMock);
    render(<CheckoutPage />);
    expect(await screen.findByRole("heading", { name: "Cà phê sữa" })).toBeDefined();
    expect(screen.getByText(/Size và topping hiện trong báo giá/)).toBeDefined();
    expect(screen.getByRole("button", { name: "Đặt hàng" }).hasAttribute("disabled")).toBe(true);
    expect(screen.queryByText("58.000đ")).toBeNull();

    fireEvent.change(screen.getByLabelText("Mã giảm giá"), { target: { value: " welcome10 " } });
    fireEvent.change(screen.getByLabelText("Số điểm muốn sử dụng"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("radio", { name: "Thẻ mô phỏng" }));
    fireEvent.click(screen.getByRole("button", { name: "Lấy báo giá" }));

    expect(await screen.findByText("50.200đ")).toBeDefined();
    expect(screen.getByText("5.800đ")).toBeDefined();
    expect(screen.getAllByText("58.000đ")).toHaveLength(2);
    expect(screen.getByText("2.000đ")).toBeDefined();
    expect(screen.getByText("Size: Mặc định")).toBeDefined();
    expect(screen.getByText("Không có topping.")).toBeDefined();
    expect(screen.getByText("Mã đã áp dụng: WELCOME10")).toBeDefined();

    const quoteCall = fetchMock.mock.calls[1];
    expect(quoteCall[0]).toBe("http://localhost:3001/api/cart/calculate");
    expect(JSON.parse(quoteCall[1].body)).toEqual({
      items: [{ productId: "prod-1", quantity: 2, note: "ít đá" }],
      couponCode: "welcome10",
      pointsUsed: 2,
      userId: "user-1",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("button", { name: "Đặt hàng" }).hasAttribute("disabled")).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Đặt hàng" }));
    expect(screen.getByText("Chưa thể hoàn tất đặt hàng lúc này. Đơn hàng chưa được tạo và bạn chưa bị trừ tiền.")).toBeDefined();
    expect(screen.queryByText(/thành công/i)).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("shows Vietnamese text for backend validation errors", async () => {
    vi.mocked(getCheckoutIdentity).mockReturnValue({ userId: "user-1" });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "cart-1",
          items: [{ id: "line-1", productId: "prod-1", quantity: 1, product: { name: "Trà đào" } }],
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          message: ["pointsUsed must not be less than 0", "couponCode must be a string"],
          error: "Bad Request",
          statusCode: 400,
        }),
      });
    vi.stubGlobal("fetch", fetchMock);
    render(<CheckoutPage />);
    await screen.findByRole("heading", { name: "Trà đào" });
    fireEvent.change(screen.getByLabelText("Số điểm muốn sử dụng"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "Lấy báo giá" }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Số điểm phải lớn hơn hoặc bằng 0.");
    expect(alert.textContent).toContain("Mã giảm giá phải là chuỗi ký tự.");
    expect(screen.queryByText("50.200đ")).toBeNull();
  });

  it("keeps a Vietnamese business error from the backend", async () => {
    vi.mocked(getCheckoutIdentity).mockReturnValue({ userId: "user-1" });
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "cart-1",
          items: [{ id: "line-1", productId: "missing", quantity: 1, product: { name: "Latte" } }],
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Mã giảm giá "ABC" không tồn tại hoặc đã hết hạn.' }),
      }));
    render(<CheckoutPage />);
    await screen.findByRole("heading", { name: "Latte" });
    fireEvent.click(screen.getByRole("button", { name: "Lấy báo giá" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      'Mã giảm giá "ABC" không tồn tại hoặc đã hết hạn.',
    );
  });

  it("keeps ordering disabled until a quote arrives and does not report a completed payment", async () => {
    vi.mocked(getCheckoutIdentity).mockReturnValue({ userId: "user-1" });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: null, items: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<CheckoutPage />);
    await screen.findByText("Giỏ hàng của bạn đang trống.");
    const orderButton = screen.getByRole("button", { name: "Đặt hàng" });
    expect(orderButton.hasAttribute("disabled")).toBe(true);
    fireEvent.click(orderButton);
    expect(screen.queryByText(/Chưa thể hoàn tất đặt hàng/)).toBeNull();
    expect(screen.queryByText(/thành công/i)).toBeNull();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });
});
