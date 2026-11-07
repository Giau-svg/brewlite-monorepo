"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import LoginForm from "../auth/login-form";
import { useAuthUser, setAuthUser } from "../../lib/auth-store";
import { authError, logout } from "../../services/auth.service";
import { usePathname } from "next/navigation";
import { setMenuQuery, useMenuView } from "../../lib/menu-view";

const links = [
  { href: "/", label: "TRANG CHỦ" },
  { href: "/menu", label: "THỰC ĐƠN" },
  { href: "/cart", label: "GIỎ HÀNG" },
  { href: "/orders", label: "LỊCH SỬ MUA HÀNG" },
];

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M8 4c-1.6 2.4-1.6 5.6 0 8M12 4c-1.6 2.4-1.6 5.6 0 8M16 4c-1.6 2.4-1.6 5.6 0 8" />
        <path d="M5 15h14a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5z" fill="currentColor" stroke="none" />
      </svg>
    </span>
  );
}

function AccountMenu() {
  const user = useAuthUser();
  const [authMessage, setAuthMessage] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const touchToggle = useRef(false);
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const open = hover || pinned;

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setHover(false);
        setPinned(false);
      }
    }
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setHover(false);
        setPinned(false);
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <>
    <div
      className="account-menu"
      ref={rootRef}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPinned(false); }}
      onFocus={() => setPinned(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setHover(false);
          setPinned(false);
        }
      }}
    >
      <button
        className="nav-tool"
        type="button"
        aria-label="Tài khoản"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onPointerUp={(event) => {
          if (event.pointerType !== "touch") return;
          touchToggle.current = true;
          setPinned((value) => !value);
        }}
        onClick={() => {
          if (touchToggle.current) {
            touchToggle.current = false;
            return;
          }
          setPinned((value) => !value);
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <circle cx="12" cy="8" r="3.2" />
          <path d="M5 19.2c1.4-3 3.8-4.4 7-4.4s5.6 1.4 7 4.4" strokeLinecap="round" />
        </svg>
        Tài khoản
      </button>
      {open && (
        <div className="account-drop">
          <div className="account-panel" id={menuId} role="menu" aria-label="Tài khoản">
            {user ? <>
              <p className="account-user">{user.fullName}<br /><small>{user.email}</small></p>
              {user.role === "CUSTOMER" && <Link href="/account" role="menuitem">Điểm thưởng và thông báo</Link>}
              {user.role === "STAFF" && <Link href="/staff/orders" role="menuitem">Đơn cần phục vụ</Link>}
              {user.role === "ADMIN" && <Link href="/admin" role="menuitem">Quản trị</Link>}
              <button type="button" role="menuitem" disabled={loggingOut} onClick={async () => {
                setLoggingOut(true); setAuthMessage("");
                try { await logout(); setAuthUser(null); setHover(false); setPinned(false); }
                catch (error) { setAuthMessage(authError(error)); }
                finally { setLoggingOut(false); }
              }}>Đăng xuất</button>
            </> : <>
              <Link href="/login" role="menuitem" onClick={(event) => { event.preventDefault(); setHover(false); setPinned(false); setAuthMode("login"); setLoginOpen(true); }}>Đăng nhập</Link>
              <button type="button" role="menuitem" onClick={() => { setHover(false); setPinned(false); setAuthMode("register"); setLoginOpen(true); }}>Đăng ký</button>
            </>}
            {authMessage && <p role="alert">{authMessage}</p>}
          </div>
        </div>
      )}
    </div>
    {loginOpen && <LoginForm initialMode={authMode} onClose={() => setLoginOpen(false)} />}
    </>
  );
}

function HeaderSearch() {
  const pathname = usePathname() ?? "";
  const { query } = useMenuView();

  return (
    <form action="/menu" className="header-search header-search-inline" role="search"
      onSubmit={(event) => { if (pathname === "/menu") event.preventDefault(); }}>
      <label className="visually-hidden" htmlFor="header-search">Tìm đồ uống</label>
      <button type="submit" aria-label="Tìm đồ uống">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" />
        </svg>
      </button>
      <input id="header-search" name="q" type="search" value={query}
        placeholder="TÌM ĐỒ UỐNG" onChange={(event) => setMenuQuery(event.target.value)} />
    </form>
  );
}
export function Header({ cartCount = 0 }: { cartCount?: number }) {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);

  function current(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header className="site-header">
      <nav className="site-nav" aria-label="Chính">
        <div className="nav-row shop-nav">
          <Link className="navbar-brand" href="/" onClick={() => setOpen(false)}>
            <BrandMark />
            BrewLite
          </Link>
          <div id="nav-menu" className={`nav-panel${open ? " open" : ""}`}>
            <ul className="nav-list">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    className={`nav-link${current(link.href) ? " active" : ""}`}
                    href={link.href}
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                    {link.href === "/cart" && cartCount > 0 && <span className="cart-count" aria-label={`${cartCount} ly`}> ({cartCount})</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="nav-tools">
            <HeaderSearch />
            <AccountMenu />
            <button
              className="navbar-toggler"
              type="button"
              aria-expanded={open}
              aria-controls="nav-menu"
              aria-label={open ? "Đóng menu" : "Mở menu"}
              onClick={() => setOpen((value) => !value)}
            >
              <span className="hamburger"><span /><span /><span /></span>
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
}

export function BrandLockup() {
  return (
    <span className="footer-brand">
      <BrandMark />
      BrewLite
    </span>
  );
}
