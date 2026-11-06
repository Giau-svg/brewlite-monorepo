import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PaymentResultPage } from "../components/payment-result/payment-result-page";
import { parsePaymentPayload } from "../lib/parse-payment-result";
import { loadPaymentResult, retryPayment } from "../services/payment-result.service";

vi.mock("../services/payment-result.service", async () => {
  const actual = await vi.importActual<typeof import("../services/payment-result.service")>(
    "../services/payment-result.service",
  );
  return {
    loadPaymentResult: vi.fn(actual.loadPaymentResult),
    retryPayment: vi.fn(actual.retryPayment),
  };
});

const confirmed = {
  status: "SUCCESS",
  orderId: "order-1",
  orderCode: "BL26001",
  transactionRef: "TX-100",
  amount: 50200,
  paidAt: "2026-11-07T02:00:00.000Z",
  method: "WALLET",
};

beforeEach(async () => {
  const actual = await vi.importActual<typeof import("../services/payment-result.service")>(
    "../services/payment-result.service",
  );
  vi.mocked(loadPaymentResult).mockImplementation(actual.loadPaymentResult);
  vi.mocked(retryPayment).mockImplementation(actual.retryPayment);
});

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe("payment confirmation parser", () => {
  it("does not treat an incomplete success payload as confirmed", () => {
    expect(parsePaymentPayload({ status: "SUCCESS", orderId: "order-1", orderCode: "BL1" }).kind).toBe("pending");
    expect(parsePaymentPayload({ status: "PENDING" }).kind).toBe("pending");
    expect(parsePaymentPayload({ status: "PROCESSING" }).kind).toBe("pending");
    expect(parsePaymentPayload({ status: "FAILED", failureReason: "Card declined" })).toEqual({
      kind: "failed",
      message: "Thanh toán chưa được ghi nhận.",
      retrySupported: false,
    });
  });

  it("accepts only a complete confirmed payload", () => {
    const result = parsePaymentPayload(confirmed);
    expect(result.kind).toBe("success");
    if (result.kind === "success") {
      expect(result.payment.orderId).toBe("order-1");
      expect(result.payment.methodLabel).toBe("Ví");
    }
  });
});

describe("payment result page", () => {
  it("shows missing data and ignores query params and localStorage", async () => {
    window.history.replaceState(null, "", "/checkout/result?status=success&orderId=order-1&orderCode=BL-FAKE");
    localStorage.setItem("paymentResult", JSON.stringify(confirmed));
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<PaymentResultPage />);
    expect(screen.getByText("Đang kiểm tra kết quả thanh toán...")).toBeDefined();
    expect(await screen.findByText("Chưa có thông tin giao dịch để hiển thị. Trang này chỉ hiện kết quả sau khi thanh toán được xác nhận.")).toBeDefined();
    expect(screen.queryByText("BL-FAKE")).toBeNull();
    expect(screen.queryByRole("link", { name: "Xem đơn hàng" })).toBeNull();
    expect(screen.queryByText("Thanh toán đã được xác nhận")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows a pending confirmation without calling it a failure", async () => {
    vi.mocked(loadPaymentResult).mockResolvedValue({ kind: "pending" });
    render(<PaymentResultPage />);
    expect(await screen.findByRole("heading", { name: "Đang chờ xác nhận" })).toBeDefined();
    expect(screen.getByText(/chưa phải là thanh toán không thành công/)).toBeDefined();
    expect(screen.queryByRole("link", { name: "Xem đơn hàng" })).toBeNull();
    expect(screen.queryByText("Thanh toán chưa hoàn tất")).toBeNull();
  });

  it("shows a failure with a way back to checkout and retries only without posting", async () => {
    vi.mocked(loadPaymentResult).mockResolvedValue({
      kind: "failed",
      message: "Số dư không đủ để thanh toán.",
      retrySupported: false,
    });
    render(<PaymentResultPage />);
    expect(await screen.findByText("Số dư không đủ để thanh toán.")).toBeDefined();
    expect(screen.getByRole("link", { name: "Quay lại thanh toán" }).getAttribute("href")).toBe("/checkout");
    expect(screen.queryByRole("button", { name: "Thử lại" })).toBeNull();

    cleanup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(loadPaymentResult).mockResolvedValue({
      kind: "failed",
      message: "Thẻ bị từ chối.",
      retrySupported: true,
    });
    render(<PaymentResultPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Thử lại" }));
    expect(await screen.findByText("Chưa thể thử thanh toán lại lúc này.")).toBeDefined();
    expect(screen.queryByText("Thanh toán đã được xác nhận")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows success only for a valid confirmation and links to the confirmed order", async () => {
    const parsed = parsePaymentPayload(confirmed);
    vi.mocked(loadPaymentResult).mockResolvedValue(parsed);
    render(<PaymentResultPage />);
    expect(await screen.findByText("Thanh toán đã được xác nhận")).toBeDefined();
    expect(screen.getByText("BL26001")).toBeDefined();
    expect(screen.getByText("TX-100")).toBeDefined();
    expect(screen.getByText(`${(50200).toLocaleString("vi-VN")}đ`)).toBeDefined();
    expect(screen.getByText("Ví")).toBeDefined();
    expect(screen.getByRole("link", { name: "Xem đơn hàng" }).getAttribute("href")).toBe("/orders/order-1");
  });

  it("shows an error and checks again without creating a payment", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(loadPaymentResult)
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ kind: "pending" });
    render(<PaymentResultPage />);
    expect(await screen.findByRole("alert")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Kiểm tra lại" }));
    expect(await screen.findByRole("heading", { name: "Đang chờ xác nhận" })).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
