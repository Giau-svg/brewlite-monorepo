import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CartProvider, useCart } from "../components/cart/cart-provider";
import { getStore, sendStore } from "../services/store.service";
vi.mock("../lib/auth-store", () => ({ useAuthUser: () => ({ id: "customer-id", role: "CUSTOMER" }), useAuthStatus: () => ({ ready: true, error: null }), refreshAuth: vi.fn() }));
vi.mock("../services/store.service", () => ({ getStore: vi.fn(), sendStore: vi.fn() }));
const line = { productId: "product-id", name: "Coffee", sizeId: "size-id", sizeName: "M", quantity: 1, unitPrice: 99000, imageUrl: null, note: "Ít đá", toppings: [] };
function Probe() { const cart = useCart(); return <><p>{cart.ready ? `Ready ${cart.subtotal}` : "Loading"}</p><button onClick={() => void cart.addLine(line)}>Add</button></>; }
afterEach(cleanup);
it("uses PostgreSQL cart and server prices after login, without persisting business data locally", async () => {
  sessionStorage.clear();
  vi.mocked(getStore).mockResolvedValue({ version: 1, items: [] });
  vi.mocked(sendStore).mockImplementation(async () => { const cart = { version: 2, items: [{ ...line, key: "db-item-id", unitPrice: "35000" }] }; vi.mocked(getStore).mockResolvedValue(cart); return cart; });
  render(<CartProvider><Probe /></CartProvider>);
  await screen.findByText("Ready 0"); fireEvent.click(screen.getByRole("button", { name: "Add" }));
  await screen.findByText("Ready 35000");
  await waitFor(() => expect(sendStore).toHaveBeenCalledWith("/cart/items", { productId: "product-id", sizeId: "size-id", toppingIds: [], quantity: 1, note: "Ít đá", expectedVersion: 1 }, "post", expect.any(String)));
  expect(sessionStorage.getItem("brewlite-config-cart")).toBeNull();
});
