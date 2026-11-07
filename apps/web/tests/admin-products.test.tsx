import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { AdminProductsPage } from "../components/admin-products/admin-products-page";
import {
  createAdminProduct,
  loadAdminCatalog,
  setAdminProductAvailability,
  updateAdminProduct,
} from "../services/admin-products.service";
import { loadMockAdminCatalog, resetAdminProductMock } from "../services/mocks/admin-products.mock";
import type { AdminCatalogResult, AdminProduct } from "../types/admin-product";

vi.mock("../services/admin-products.service", async () => {
  const actual = await vi.importActual<typeof import("../services/admin-products.service")>(
    "../services/admin-products.service",
  );
  return {
    ...actual,
    loadAdminCatalog: vi.fn(actual.loadAdminCatalog),
    createAdminProduct: vi.fn(actual.createAdminProduct),
    updateAdminProduct: vi.fn(actual.updateAdminProduct),
    setAdminProductAvailability: vi.fn(actual.setAdminProductAvailability),
  };
});

async function actualService() {
  return vi.importActual<typeof import("../services/admin-products.service")>(
    "../services/admin-products.service",
  );
}

beforeEach(async () => {
  resetAdminProductMock();
  const actual = await actualService();
  vi.mocked(loadAdminCatalog).mockImplementation(actual.loadAdminCatalog);
  vi.mocked(createAdminProduct).mockImplementation(actual.createAdminProduct);
  vi.mocked(updateAdminProduct).mockImplementation(actual.updateAdminProduct);
  vi.mocked(setAdminProductAvailability).mockImplementation(actual.setAdminProductAvailability);
});

afterEach(() => {
  cleanup();
  resetAdminProductMock();
  vi.unstubAllGlobals();
});

async function showReadyCatalog() {
  const catalog = await loadMockAdminCatalog();
  const ready: AdminCatalogResult = {
    kind: "ready",
    products: catalog.products,
    toppings: catalog.toppings,
  };
  vi.mocked(loadAdminCatalog).mockResolvedValue(ready);
}

describe("admin products", () => {
  it("returns unavailable from the app service and does not call fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const actual = await actualService();
    expect(await actual.loadAdminCatalog()).toEqual({ kind: "unavailable" });
    const created = await actual.createAdminProduct({
      name: "Bạc xỉu",
      description: "",
      basePrice: 32000,
      imageUrl: "",
      isAvailable: true,
      sizes: [{ name: "Size M", extraPrice: 0 }],
      toppingIds: [],
    });
    expect(created.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the disconnected state and hides sample products", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminProductsPage />);
    expect(screen.getByText("Đang tải sản phẩm...")).toBeDefined();
    expect(await screen.findByText("Chưa kết nối dữ liệu sản phẩm.")).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Cà phê sữa" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Trà đào" })).toBeNull();
    expect(screen.queryByText(/dữ liệu minh họa/)).toBeNull();
    expect((screen.getByRole("button", { name: "Thêm sản phẩm" }) as HTMLButtonElement).disabled).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows an error and does not fall back to sample products", async () => {
    vi.mocked(loadAdminCatalog)
      .mockRejectedValueOnce(new Error("down"))
      .mockResolvedValueOnce({ kind: "unavailable" });
    render(<AdminProductsPage />);
    expect((await screen.findByRole("alert")).textContent).toContain("Không tải được danh sách sản phẩm");
    expect(screen.queryByRole("heading", { name: "Cà phê sữa" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByText("Chưa kết nối dữ liệu sản phẩm.")).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Cà phê sữa" })).toBeNull();
  });

  it("shows loading while the catalog request is pending", () => {
    vi.mocked(loadAdminCatalog).mockImplementation(() => new Promise(() => {}));
    render(<AdminProductsPage />);
    expect(screen.getByText("Đang tải sản phẩm...")).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByText("Chưa kết nối dữ liệu sản phẩm.")).toBeNull();
  });

  it("searches without accents and filters hidden products from a ready catalog", async () => {
    await showReadyCatalog();
    render(<AdminProductsPage />);
    await screen.findByRole("heading", { name: "Cà phê sữa" });
    fireEvent.change(screen.getByLabelText("Tìm theo tên"), { target: { value: "ca phe" } });
    expect(screen.getByRole("heading", { name: "Cà phê sữa" })).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Trà đào" })).toBeNull();
    fireEvent.change(screen.getByLabelText("Tìm theo tên"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Đang ẩn" }));
    expect(screen.getByRole("heading", { name: "Trà đào" })).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Cà phê sữa" })).toBeNull();
    fireEvent.change(screen.getByLabelText("Tìm theo tên"), { target: { value: "khong co" } });
    expect(screen.getByText("Không có sản phẩm phù hợp.")).toBeDefined();
  });

  it("keeps the form open when the price is invalid", async () => {
    await showReadyCatalog();
    render(<AdminProductsPage />);
    await screen.findByRole("heading", { name: "Cà phê sữa" });
    fireEvent.click(screen.getByRole("button", { name: "Thêm sản phẩm" }));
    fireEvent.change(screen.getByLabelText("Tên sản phẩm"), { target: { value: "Sữa" } });
    fireEvent.change(screen.getByLabelText("Giá gốc (đ)"), { target: { value: "-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu sản phẩm" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Giá gốc phải là số tiền nguyên");
    expect(screen.queryByRole("heading", { name: "Sữa" })).toBeNull();
    expect(createAdminProduct).not.toHaveBeenCalled();
  });

  it("does not add or reveal a product when the server has not confirmed", async () => {
    await showReadyCatalog();
    render(<AdminProductsPage />);
    await screen.findByRole("heading", { name: "Cà phê sữa" });
    fireEvent.click(screen.getByRole("button", { name: "Thêm sản phẩm" }));
    fireEvent.change(screen.getByLabelText("Tên sản phẩm"), { target: { value: "Bạc xỉu" } });
    fireEvent.change(screen.getByLabelText("Giá gốc (đ)"), { target: { value: "32000" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu sản phẩm" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Chưa thể lưu thay đổi lúc này.");
    expect(screen.queryByRole("heading", { name: "Bạc xỉu" })).toBeNull();

    const card = screen.getByRole("heading", { name: "Trà đào" }).closest("article");
    if (!card) throw new Error("missing product card");
    fireEvent.click(within(card).getByRole("button", { name: "Hiện trên menu" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Chưa thể lưu thay đổi lúc này.");
    expect(within(card).getByText("Đang ẩn")).toBeDefined();
  });

  it("shows a product only after the service confirms it", async () => {
    await showReadyCatalog();
    const confirmed: AdminProduct = {
      id: "srv-bac-xiu",
      name: "Bạc xỉu",
      description: "",
      basePrice: 32000,
      imageUrl: "",
      isAvailable: true,
      hasOrders: false,
      sizes: [{ id: "srv-size-m", name: "Size M", extraPrice: 0 }],
      toppingIds: ["top-cheese"],
    };
    vi.mocked(createAdminProduct).mockResolvedValue({ ok: true, product: confirmed });
    render(<AdminProductsPage />);
    await screen.findByRole("heading", { name: "Cà phê sữa" });
    fireEvent.click(screen.getByRole("button", { name: "Thêm sản phẩm" }));
    fireEvent.change(screen.getByLabelText("Tên sản phẩm"), { target: { value: "Bạc xỉu" } });
    fireEvent.change(screen.getByLabelText("Giá gốc (đ)"), { target: { value: "32000" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Kem cheese" }));
    fireEvent.click(screen.getByRole("button", { name: "Lưu sản phẩm" }));
    const created = (await screen.findByRole("heading", { name: "Bạc xỉu" })).closest("article");
    if (!created) throw new Error("missing product card");
    expect(within(created).getByText("Topping: Kem cheese")).toBeDefined();
  });
});
