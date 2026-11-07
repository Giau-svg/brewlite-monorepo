import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CartProvider, useCart } from "../components/cart/cart-provider";
vi.mock("../lib/auth-store", () => ({ useAuthUser: () => null, useAuthStatus: () => ({ ready: true, error: null }), refreshAuth: vi.fn() }));

function CartControls() {
  const cart = useCart();
  return <>
    <button onClick={cart.clear}>Reset</button>
    <button onClick={() => cart.addLine({ productId: "coffee", name: "Coffee", imageUrl: null, sizeId: null, sizeName: "M", toppings: [], quantity: 1, unitPrice: 30000, note: "" })}>Add</button>
    <button onClick={() => cart.setQuantity(cart.lines[0].key, 0)}>Decrease</button>
    <output aria-label="Count">{cart.count}</output>
    <p>{cart.toast}</p>
  </>;
}

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it("keeps the last drink when removal is cancelled and removes only after confirmation", () => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute("open"); } });
  render(<CartProvider><CartControls /></CartProvider>);
  fireEvent.click(screen.getByText("Reset"));
  fireEvent.click(screen.getByText("Add"));
  expect(screen.getByText("Thêm vào giỏ hàng thành công")).toBeTruthy();
  fireEvent.click(screen.getByText("Decrease"));
  expect(screen.getByRole("dialog", { name: "Xác nhận xóa món" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Hủy" }));
  expect(screen.getByLabelText("Count").textContent).toBe("1");

  fireEvent.click(screen.getByText("Decrease"));
  fireEvent.click(screen.getByRole("button", { name: "Xóa món" }));
  expect(screen.getByLabelText("Count").textContent).toBe("0");
});
