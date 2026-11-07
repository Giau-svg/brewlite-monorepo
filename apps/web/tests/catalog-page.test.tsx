import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { filterCatalog, pageCount, pageSlice } from "../lib/catalog";
import { resetMenuView, setMenuQuery } from "../lib/menu-view";
import { MenuCatalog } from "../components/menu/menu-catalog";
import { makeProduct } from "./product-fixture";
import type { Product } from "../types/product";

function drink(name: string, category: string, id: string): Product {
  return makeProduct({
    id,
    name,
    basePrice: "29000",
    categoryId: category,
    category: { id: category, name: category },
  });
}

const drinks = [
  drink("Cà phê sữa đá", "Cà phê", "11111111-1111-4111-8111-111111111111"),
  drink("Latte hạnh nhân", "Cà phê", "11111111-1111-4111-8111-111111111112"),
  drink("Trà đào", "Trà trái cây", "11111111-1111-4111-8111-111111111113"),
  drink("Trà sữa ô long", "Trà sữa", "11111111-1111-4111-8111-111111111114"),
];

afterEach(() => { cleanup(); resetMenuView(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("catalog filtering and pages", () => {
  it("filters by category, accent-insensitive search, and both together", () => {
    expect(filterCatalog(drinks, "Tất cả", "").map((item) => item.name)).toEqual(drinks.map((item) => item.name));
    expect(filterCatalog(drinks, "Cà phê", "").map((item) => item.name)).toEqual(["Cà phê sữa đá", "Latte hạnh nhân"]);
    expect(filterCatalog(drinks, "Trà trái cây", "sua")).toEqual([]);
    expect(filterCatalog(drinks, "Cà phê", "sua").map((item) => item.name)).toEqual(["Cà phê sữa đá"]);
    expect(filterCatalog(drinks, "Trà sữa", "").map((item) => item.name)).toEqual(["Trà sữa ô long"]);
    expect(filterCatalog(drinks, "Đá xay & Matcha", "")).toEqual([]);
  });

  it.each([
    [0, 0],
    [1, 1],
    [12, 1],
    [13, 2],
    [36, 3],
  ])("counts %s products as %s pages", (total, pages) => {
    expect(pageCount(total)).toBe(pages);
  });

  it("slices 13 products into 12 and then the remainder", () => {
    const items = Array.from({ length: 13 }, (_, index) => index + 1);
    expect(pageSlice(items, 1).items).toHaveLength(12);
    expect(pageSlice(items, 2)).toMatchObject({ items: [13], page: 2, pages: 2 });
    expect(pageSlice(items, 9).page).toBe(2);
    expect(pageSlice([], 3)).toMatchObject({ items: [], page: 1, pages: 0 });
  });

  it("keeps decimal prices while paging, filtering and resetting the page", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:3001");
    const products = Array.from({ length: 13 }, (_, index) => drink(`Món ${index + 1}`, index < 12 ? "Cà phê" : "Trà sữa", `11111111-1111-4111-8111-${String(index + 1).padStart(12, "0")}`));
    products[0] = drink("Cà phê sữa", "Cà phê", products[0].id);
    products[0].basePrice = "39000.50";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => products }));
    render(<MenuCatalog variant="page" />);
    expect(await screen.findByRole("heading", { name: "Cà phê sữa" })).toBeDefined();
    expect(screen.getAllByText("39.000,5đ").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("article")).toHaveLength(12);
    expect(screen.getByText("1 / 2")).toBeDefined();
    expect(screen.getByRole("button", { name: "Trước" }).hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Sau" }));
    expect(screen.getByText("2 / 2")).toBeDefined();
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Sau" }).hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Cà phê" }));
    expect(screen.getByText("1 / 1")).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Món 13" })).toBeNull();
    expect(screen.queryByRole("searchbox")).toBeNull();
    act(() => setMenuQuery("sua"));
    expect(screen.getByRole("heading", { name: "Cà phê sữa" })).toBeDefined();
    expect(screen.getAllByRole("article")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Trà sữa" }));
    expect(screen.getByText("Không tìm thấy đồ uống phù hợp.")).toBeDefined();
    act(() => setMenuQuery(""));
    expect(screen.getByRole("heading", { name: "Món 13" })).toBeDefined();
  });
});
