import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CheckoutReview } from "../components/checkout/checkout-review";
import { CartPageBody } from "../components/cart/cart-page-body";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("../services/auth.service", () => ({ currentUser: async () => null, authError: () => "Lỗi", authHttp: {} }));
vi.mock("../components/cart/cart-provider", () => ({ useCart: () => ({
  lines: [{ key: "coffee-m", productId: "coffee", name: "Coffee", sizeName: "M", toppings: [], note: "", imageUrl: null, quantity: 2, unitPrice: 35000 }],
  subtotal: 70000, count: 2, setQuantity: vi.fn(), remove: vi.fn(),
}) }));
vi.mock("../components/cart/cart-lines", () => ({ CartLines: () => <p>Coffee x 2</p> }));
vi.mock("../components/auth/login-form", () => ({ default: ({ onClose }: { onClose: () => void }) => <div role="dialog" aria-label="Đăng nhập"><button onClick={onClose}>Đóng</button></div> }));
Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute("open", ""); } });
Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute("open"); } });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("confirms purchase directly from the cart and asks for login", async () => {
  render(<CartPageBody />);
  expect(screen.queryByRole("link", { name: "Xem lại đơn" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận mua" }));
  expect(await screen.findByRole("dialog", { name: "Đăng nhập" })).toBeTruthy();
  expect(screen.queryByRole("textbox", { name: /Mã giảm giá/ })).toBeNull();
  expect(screen.queryByRole("checkbox")).toBeNull();
  expect(screen.getAllByText("70.000đ").length).toBeGreaterThan(0);
});

it("requires login on confirmation without calling quote or order APIs and preserves the review", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  render(<CheckoutReview />);
  expect(screen.queryByRole("textbox")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận mua" }));
  expect(await screen.findByRole("dialog", { name: "Đăng nhập" })).toBeTruthy();
  expect(fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Đóng" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByText("Coffee x 2")).toBeTruthy();
  expect(screen.getByText("70.000đ")).toBeTruthy();
});