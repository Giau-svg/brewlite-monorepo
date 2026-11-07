import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const pathname = vi.hoisted(() => ({ value: "/products/11111111-1111-4111-8111-111111111111" }));

vi.mock("next/navigation", () => ({
  usePathname: () => pathname.value,
}));

import { BackLink, BackToTop } from "../components/layout/page-tools";

afterEach(() => {
  cleanup();
  pathname.value = "/products/11111111-1111-4111-8111-111111111111";
  vi.restoreAllMocks();
});

describe("back and top controls", () => {
  it("returns to the previous in-site page and otherwise falls back to the menu", () => {
    const back = vi.spyOn(window.history, "back").mockImplementation(() => {});
    const assign = vi.fn();
    Object.defineProperty(window, "location", { configurable: true, value: { origin: "http://localhost:3000", assign } });
    Object.defineProperty(document, "referrer", { configurable: true, value: "http://localhost:3000/menu" });
    render(<BackLink />);
    const link = screen.getByRole("link", { name: "Quay lại" });
    expect(link.getAttribute("href")).toBe("/menu");
    fireEvent.click(link);
    expect(back).toHaveBeenCalledOnce();
    expect(assign).not.toHaveBeenCalled();

    Object.defineProperty(document, "referrer", { configurable: true, value: "https://example.test/ads" });
    fireEvent.click(link);
    expect(assign).toHaveBeenCalledWith("/menu");

    pathname.value = "/";
    cleanup();
    render(<BackLink />);
    expect(screen.queryByRole("link", { name: "Quay lại" })).toBeNull();
  });

  it("shows the top button after scrolling and scrolls upward", () => {
    const scrollTo = vi.fn();
    Object.defineProperty(window, "scrollTo", { configurable: true, value: scrollTo });
    Object.defineProperty(window, "scrollY", { configurable: true, value: 0, writable: true });
    render(<BackToTop />);
    expect(screen.queryByRole("button", { name: "Lên đầu trang" })).toBeNull();
    window.scrollY = 360;
    fireEvent.scroll(window);
    const button = screen.getByRole("button", { name: "Lên đầu trang" });
    fireEvent.click(button);
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });
});
