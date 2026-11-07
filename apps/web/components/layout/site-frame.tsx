"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { formatPrice } from "../../lib/format-price";
import { CartProvider, useCart } from "../cart/cart-provider";
import { CartLines } from "../cart/cart-lines";
import { ProductImage } from "../menu/product-image";
import { CenteredDialog } from "../ui/centered-dialog";
import { Footer } from "./footer";
import { Header } from "./header";
import { BackLink, BackToTop } from "./page-tools";

export function SiteFrame({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <SiteChrome>{children}</SiteChrome>
    </CartProvider>
  );
}

function SiteChrome({ children }: { children: ReactNode }) {
  const { isOpen, closeCart, subtotal, count, toast, lines, lastAdded, dismissToast } = useCart();

  useEffect(() => {
    if (!isOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") closeCart();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, closeCart]);

  return (
    <>
      <a className="skip-link" href="#main">Bỏ qua điều hướng</a>
      <Header />
      <main id="main">
        <BackLink />
        {children}
      </main>
      <BackToTop />
      <Footer />
      {isOpen && (
        <div className="bag-backdrop" onClick={closeCart}>
          <div
            className="bag-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bag-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <h2 id="bag-title" style={{ margin: 0, fontSize: "1.35rem" }}>Giỏ của bạn</h2>
              <button type="button" className="cart-remove" aria-label="Đóng giỏ hàng" onClick={closeCart}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </header>
            <div className="bag-scroll">
              <CartLines />
            </div>
            <footer>
              <div className="cart-total"><span>Tạm tính</span><span className="amt">{formatPrice(subtotal)}đ</span></div>
              {lines.length > 0 ? (
                <Link className="btn btn-espresso btn-lg" href="/checkout" style={{ width: "100%" }} onClick={closeCart}>Xem lại đơn</Link>
              ) : (
                <button type="button" className="btn btn-espresso btn-lg" style={{ width: "100%" }} disabled>Xem lại đơn</button>
              )}
              <button type="button" className="btn btn-ghost" style={{ width: "100%", marginTop: ".5rem" }} onClick={closeCart}>Tiếp tục chọn món</button>
              <p className="visually-hidden">{count} món</p>
            </footer>
          </div>
        </div>
      )}
      {toast && <CenteredDialog label="Thông báo giỏ hàng" onClose={dismissToast}><div className="cart-success">
        <div className="cart-success-heading">
          <p role="status">✓ {toast}</p>
          <button type="button" onClick={dismissToast} aria-label="Đóng thông báo">×</button>
        </div>
        {lastAdded && <div className="cart-success-product">
          <ProductImage key={lastAdded.imageUrl} url={lastAdded.imageUrl} name={lastAdded.name} />
          <div><strong>{lastAdded.name}</strong><p>{lastAdded.sizeName} · {lastAdded.quantity} ly</p></div>
        </div>}
        <div className="cart-success-total"><span>Giỏ hàng hiện có</span><div><strong>{formatPrice(subtotal)}đ</strong><p>({count}) sản phẩm</p></div></div>
        <div className="cart-success-actions">
          <Link href="/checkout" onClick={dismissToast}>Thanh toán</Link>
          <Link href="/cart" className="cart-success-view" onClick={() => { dismissToast(); closeCart(); }}>Xem giỏ hàng</Link>
        </div>
      </div></CenteredDialog>}
    </>
  );
}
