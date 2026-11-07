import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { SiteFrame } from "../components/layout/site-frame";

afterEach(cleanup);

describe("header account menu", () => {
  it("keeps login hidden until hover, focus, click, and closes with Escape", () => {
    render(<SiteFrame><p>Trang</p></SiteFrame>);
    const nav = within(screen.getByRole("navigation", { name: "Chính" }));
    expect(nav.getByRole("link", { name: "TRANG CHỦ" }).getAttribute("href")).toBe("/");
    expect(nav.getByRole("link", { name: "THỰC ĐƠN" }).getAttribute("href")).toBe("/menu");
    expect(nav.getByRole("link", { name: "GIỎ HÀNG" }).getAttribute("href")).toBe("/cart");
    expect(nav.getByRole("link", { name: "LỊCH SỬ MUA HÀNG" }).getAttribute("href")).toBe("/orders");
    expect(nav.getByRole("searchbox", { name: "Tìm đồ uống" })).toBeTruthy();
    expect(screen.queryByRole("menu", { name: "Tài khoản" })).toBeNull();

    const account = screen.getByRole("button", { name: "Tài khoản" });
    fireEvent.mouseEnter(account.parentElement!);
    let menu = screen.getByRole("menu", { name: "Tài khoản" });
    expect(within(menu).getByRole("menuitem", { name: "Đăng nhập" }).getAttribute("href")).toBe("/login");
    expect(within(menu).getByRole("menuitem", { name: /Đăng ký/ }).getAttribute("aria-disabled")).toBeNull();
    expect(within(menu).queryByRole("link", { name: /Đăng ký/ })).toBeNull();
    fireEvent.mouseLeave(account.parentElement!);
    expect(screen.queryByRole("menu", { name: "Tài khoản" })).toBeNull();

    fireEvent.focus(account);
    expect(screen.getByRole("menu", { name: "Tài khoản" })).toBeDefined();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu", { name: "Tài khoản" })).toBeNull();

    fireEvent.click(account);
    menu = screen.getByRole("menu", { name: "Tài khoản" });
    fireEvent.click(account);
    expect(screen.queryByRole("menu", { name: "Tài khoản" })).toBeNull();
  });
});
