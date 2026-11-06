import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { getProducts } from "../services/product.service";
import { ProductCard } from "../components/menu/product-card";
import { formatPrice } from "../lib/format-price";
import { makeProduct } from "./product-fixture";
import Home from "../app/page";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("API compatibility", () => {
  it.each(["http://localhost:3001", "http://localhost:3001/", "http://localhost:3001/api", "http://localhost:3001/api/"])("normalizes %s without duplicating api", async (base) => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", base);
    const products = [makeProduct({ categoryId: "category-id", category: { id: "category-id", name: "Coffee" }, sizes: [{ id: "size-id", productId: "11111111-1111-4111-8111-111111111111", name: "M", extraPrice: "6000" }] })];
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => products });
    vi.stubGlobal("fetch", fetchMock);
    expect(await getProducts()).toEqual(products);
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:3001/api/products");
  });

  it.each(["", "NaN", "Infinity", "-1", "invalid", null, -1, Infinity])("rejects invalid price %s through the menu error state", async (basePrice) => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:3001");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [{ ...makeProduct(), basePrice }] }));
    render(<Home />);
    expect(await screen.findByRole("alert")).toBeDefined();
    expect(screen.getByRole("button")).toBeDefined();
    expect(screen.queryByRole("article")).toBeNull();
  });

  it("rejects the old product contract instead of rendering invalid prices", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:3001");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [{ id: 1, name: "Latte", price: 39000, image: "coffee" }] }));
    await expect(getProducts()).rejects.toThrow("Invalid product response");
  });
});

describe("product card", () => {
  it.each(["39000", "39000.00", 39000])("formats Decimal/numeric price %s as VND", (basePrice) => {
    render(<ProductCard product={makeProduct({ basePrice })} />);
    expect(screen.getByText("39.000đ")).toBeDefined();
  });

  it("preserves fractional values and rejects whitespace", () => {
    expect(formatPrice("39000.50")).toBe("39.000,5");
    expect(() => formatPrice(" ")).toThrow();
  });

  it.each([null, "not-a-url", "javascript:alert(1)"])("falls back for missing or invalid image %s", (imageUrl) => {
    render(<ProductCard product={makeProduct({ imageUrl })} />);
    expect(screen.getByRole("img", { name: /Chưa có ảnh/ }).textContent).toBe("☕");
  });

  it("renders the URL and falls back after a load error", () => {
    render(<ProductCard product={makeProduct({ imageUrl: "https://images.example.test/latte.jpg" })} />);
    const image = screen.getByRole("img", { name: "Latte" });
    expect(image.getAttribute("src")).toBe("https://images.example.test/latte.jpg");
    fireEvent.error(image);
    expect(screen.getByRole("img", { name: /Chưa có ảnh/ })).toBeDefined();
  });
});
describe("product description and search", () => {
  it("shows the actual API description and trims display whitespace", () => {
    render(<ProductCard product={makeProduct({ name: "Cà phê sữa đá  ", description: "  Cà phê đậm đà kết hợp với sữa đặc  " })} />);
    expect(screen.getByRole("heading", { name: "Cà phê sữa đá" }).textContent).toBe("Cà phê sữa đá");
    expect(screen.getByText("Cà phê đậm đà kết hợp với sữa đặc")).toBeDefined();
    expect(screen.queryByText("Thức uống thơm ngon dành cho bạn.")).toBeNull();
  });

  it.each([null, "", "   "])("uses the default description for %s", (description) => {
    render(<ProductCard product={makeProduct({ description })} />);
    expect(screen.getByText("Thức uống thơm ngon dành cho bạn.")).toBeDefined();
  });

  it.each(["Cà phê sữa đá", "ca phe sua da", "CA PHE SUA DA", "sữa đá"])("finds a trailing-space product with %s", async (query) => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:3001");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [makeProduct({ name: "Cà phê sữa đá  " })] }));
    render(<Home />);
    await screen.findByRole("heading", { name: "Cà phê sữa đá" });
    const search = screen.getByRole("searchbox");
    fireEvent.change(search, { target: { value: query } });
    expect(screen.getAllByRole("article")).toHaveLength(1);
    fireEvent.change(search, { target: { value: "unknown" } });
    expect(screen.queryByRole("article")).toBeNull();
    fireEvent.change(search, { target: { value: "" } });
    expect(screen.getAllByRole("article")).toHaveLength(1);
  });
});