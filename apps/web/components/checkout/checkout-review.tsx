"use client";

import { useState } from "react";
import Link from "next/link";
import LoginForm from "../auth/login-form";
import { formatPrice } from "../../lib/format-price";
import { useCart } from "../cart/cart-provider";
import { CartLines } from "../cart/cart-lines";

export function CheckoutReview() {
  const { lines, subtotal } = useCart();
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <>
      <section className="page-hero checkout-review-heading">
        <div className="container">
          <p className="crumbs"><Link href="/menu">Menu</Link><span>/</span>Xem lại đơn</p>
          <h1>Xem lại đơn</h1>
        </div>
      </section>
      <section className="section">
        <div className="container checkout-review-panel">
          {lines.length === 0 ? (
            <div>
              <p>Giỏ đang trống nên chưa thể xem giá.</p>
              <Link href="/menu" className="btn btn-espresso">Về menu</Link>
            </div>
          ) : (
            <>
              <CartLines />
              <div className="cart-total"><span>Tạm tính</span><span className="amt">{formatPrice(subtotal)}đ</span></div>
              <button type="button" className="btn btn-espresso btn-lg" style={{ width: "100%", marginTop: "1.2rem" }} onClick={() => setLoginOpen(true)}>
                Xác nhận mua
              </button>
            </>
          )}
        </div>
      </section>
      {loginOpen && <LoginForm onClose={() => setLoginOpen(false)} />}
    </>
  );
}
