import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { FeatureSlider } from "../components/menu/feature-slider";
import { makeProduct } from "./product-fixture";

const drinks = [
  makeProduct({ id: "11111111-1111-4111-8111-111111111111", name: "Latte Hạnh Nhân", basePrice: "45000" }),
  makeProduct({ id: "11111111-1111-4111-8111-111111111112", name: "Trà đào", basePrice: "35000" }),
];

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("feature slider", () => {
  it("links the visible drink, advances that link, and keeps navigation controls on the slide", () => {
    vi.useFakeTimers();
    render(<FeatureSlider products={drinks} />);
    const slide = screen.getByRole("link", { name: "Xem Latte Hạnh Nhân" });
    expect(slide.getAttribute("href")).toBe("/products/11111111-1111-4111-8111-111111111111");
    fireEvent.click(slide);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByText("Đã thêm vào giỏ hàng")).toBeNull();

    act(() => { vi.advanceTimersByTime(4000); });
    expect(screen.getByRole("link", { name: "Xem Trà đào" }).getAttribute("href")).toBe("/products/11111111-1111-4111-8111-111111111112");

    fireEvent.click(screen.getByRole("button", { name: "Slide trước" }));
    expect(screen.getByRole("link", { name: "Xem Latte Hạnh Nhân" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Slide sau" }));
    expect(screen.getByRole("link", { name: "Xem Trà đào" })).toBeDefined();
    expect(screen.queryByRole("link", { name: "Slide sau" })).toBeNull();

    fireEvent.mouseEnter(screen.getByRole("region", { name: "Sản phẩm nổi bật" }));
    act(() => { vi.advanceTimersByTime(8000); });
    expect(screen.getByRole("link", { name: "Xem Trà đào" })).toBeDefined();
  });
});
