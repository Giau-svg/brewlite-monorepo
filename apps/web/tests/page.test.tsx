import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import Home from "../app/page";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
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
      json: async () => [{ id: 1, name: "Latte", price: 39000, image: "☕" }],
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<Home />);
    expect(await screen.findByRole("heading", { name: "Latte" })).toBeDefined();
    expect(screen.getByText(`${(39000).toLocaleString("vi-VN")}đ`)).toBeDefined();
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:3001/products");
    expect(screen.queryByText("Đang tải menu...")).toBeNull();
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
