import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SiteFrame } from "../components/layout/site-frame";
import { ProductDetailView } from "../components/product/product-detail";
import { makeProduct } from "./product-fixture";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/products/test" }));

Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute("open", ""); } });
Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute("open"); } });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const detail = {
  ...makeProduct({
    name: "Latte Hạnh Nhân",
    description: "Latte béo với hạnh nhân rang",
    basePrice: "45000",
    category: { id: "cat", name: "Cà phê" },
    sizes: [
      { id: "size-m", productId: "11111111-1111-4111-8111-111111111111", name: "M", extraPrice: "0" },
      { id: "size-l", productId: "11111111-1111-4111-8111-111111111111", name: "L", extraPrice: "6000" },
    ],
  }),
  availableToppings: [{ id: "top-1", name: "Trân châu", price: "5000", isAvailable: true }],
};

describe("product detail", () => {
  it("shows the drink once and does not open or fill the cart", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:3001");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => detail }));
    render(
      <SiteFrame>
        <ProductDetailView id="11111111-1111-4111-8111-111111111111" />
      </SiteFrame>,
    );

    expect(await screen.findByRole("heading", { level: 1, name: "Latte Hạnh Nhân" })).toBeDefined();
    expect(screen.getAllByRole("heading", { level: 1, name: "Latte Hạnh Nhân" })).toHaveLength(1);
    expect(screen.getAllByText("Latte béo với hạnh nhân rang")).toHaveLength(1);
    expect(screen.queryByText("Trang chủ / Menu / Chi tiết")).toBeNull();
    expect(screen.queryByText("Chọn size, topping và số lượng. Tạm tính trên trang này chưa phải giá chốt của máy chủ.")).toBeNull();
    expect(screen.getAllByText("45.000đ").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /L ·/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Trân châu/ }));
    expect(screen.getAllByText("56.000đ").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Ghi chú")).toBeDefined();

    const add = screen.getByRole("button", { name: "Thêm vào giỏ hàng" });
    expect(add.hasAttribute("disabled")).toBe(false);
    fireEvent.click(add);
    expect(screen.getByText(/Thêm vào giỏ hàng thành công/)).toBeDefined();
    expect(screen.getByRole("dialog", { name: "Thông báo giỏ hàng" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Mở giỏ hàng" })).toBeNull();
    const nav = screen.getByRole("navigation", { name: "Chính" });
    expect(nav.querySelector('a[href="/cart"]')?.textContent).toContain("GIỎ HÀNG");
    expect(screen.getByRole("heading", { level: 1, name: "Latte Hạnh Nhân" })).toBeDefined();
    expect(screen.getAllByText("56.000đ").length).toBeGreaterThan(0);
  });
});