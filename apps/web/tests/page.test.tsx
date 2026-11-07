import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import Home from "../app/page";
import { makeProduct } from "./product-fixture";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:3001");
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("menu", () => {
  it("shows loading while the catalog request is pending", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    render(<Home />);
    expect(screen.getByText("Đang tải menu...")).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("renders the product name and price returned by the API", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [makeProduct()],
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<Home />);
    expect(await screen.findByRole("heading", { name: "Latte" })).toBeDefined();
    expect(screen.getByText(`${(39000).toLocaleString("vi-VN")}đ`)).toBeDefined();
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:3001/api/products");
    expect(screen.queryByText("Đang tải menu...")).toBeNull();
  });

  it("uses the configured backend URL and accepts a trailing slash", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.test/");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
    vi.stubGlobal("fetch", fetchMock);
    render(<Home />);
    await screen.findByText("Hiện chưa có thức uống nào.");
    expect(fetchMock).toHaveBeenCalledWith("https://api.example.test/api/products");
  });

  it("shows an empty state for an empty catalog", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
    render(<Home />);
    expect(await screen.findByText("Hiện chưa có thức uống nào.")).toBeDefined();
  });

  it.each(["network", "http"])("shows an error after a %s failure", async (failure) => {
    const fetchMock = failure === "network"
      ? vi.fn().mockRejectedValue(new Error("Network unavailable"))
      : vi.fn().mockResolvedValue({ ok: false, status: 500 });
    vi.stubGlobal("fetch", fetchMock);
    render(<Home />);
    expect((await screen.findByRole("alert")).textContent).toContain("Không thể kết nối");
    expect(screen.queryByText("Hiện chưa có thức uống nào.")).toBeNull();
  });
});


describe("catalog search and retry", () => {
  it("filters names without case or accent sensitivity and restores results on clear", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [
      makeProduct({ name: "Cà phê sữa", basePrice: "29000" }),
      makeProduct({ id: "11111111-1111-4111-8111-111111111112", name: "Trà đào", basePrice: "35000" }),
    ] });
    vi.stubGlobal("fetch", fetchMock);
    render(<Home />);
    await screen.findByRole("heading", { name: "Cà phê sữa" });
    const search = screen.getByRole("searchbox", { name: "Tìm đồ uống theo tên" });
    fireEvent.change(search, { target: { value: "  TRA DAO  " } });
    expect(screen.getByRole("heading", { name: "Trà đào" })).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Cà phê sữa" })).toBeNull();
    fireEvent.change(search, { target: { value: "unknown" } });
    expect(screen.getByText("Không tìm thấy đồ uống phù hợp.")).toBeDefined();
    fireEvent.change(search, { target: { value: "" } });
    expect(screen.getAllByRole("article")).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries a failed request, shows loading and renders recovered products", async () => {
    let resolveRequest!: (value: unknown) => void;
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error("offline"))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveRequest = resolve; }));
    vi.stubGlobal("fetch", fetchMock);
    render(<Home />);
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Thử tải lại" }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("Đang tải menu...")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Thử tải lại" })).toBeNull();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    resolveRequest({ ok: true, json: async () => [makeProduct()] });
    expect(await screen.findByRole("heading", { name: "Latte" })).toBeDefined();
  });

  it("keeps retry available if the next request also fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    render(<Home />);
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Thử tải lại" }));
    expect(await screen.findByRole("alert")).toBeDefined();
    expect(screen.getByRole("button", { name: "Thử tải lại" })).toBeDefined();
  });
});
