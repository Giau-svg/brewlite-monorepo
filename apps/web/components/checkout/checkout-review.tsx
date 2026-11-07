"use client";

import { useState } from "react";
import Link from "next/link";
import LoginForm from "../auth/login-form";
import { formatPrice } from "../../lib/format-price";
import { useCart } from "../cart/cart-provider";
import { CartLines } from "../cart/cart-lines";
import { calculateQuote, type PriceQuote } from "../../services/quote.service";

export function CheckoutReview() {
  const { lines, subtotal, clear } = useCart();
  const [coupon, setCoupon] = useState("");
  const [quote, setQuote] = useState<PriceQuote | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  async function reprice() {
    setPending(true);
    setMessage("");
    setQuote(null);
    try {
      setQuote(await calculateQuote(lines, coupon));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Máy chủ không tính được giá. Vui lòng thử lại.");
    } finally {
      setPending(false);
    }
  }

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
              <label className="field-label" htmlFor="coupon">Mã giảm giá</label>
              <input id="coupon" className="field-input" value={coupon} onChange={(event) => setCoupon(event.target.value)} placeholder="Nhập nếu có" />
              <div style={{ display: "flex", flexWrap: "wrap", gap: ".6rem", marginTop: "1rem" }}>
                <button type="button" className="btn btn-espresso" onClick={reprice} disabled={pending}>
                  {pending ? "Đang cập nhật..." : "Cập nhật tổng tiền"}
                </button>
                <button type="button" className="btn btn-ghost" onClick={clear}>Xóa giỏ hàng</button>
              </div>
              {message && <p role="alert" style={{ marginTop: "1rem" }}>{message}</p>}
              {quote && (
                <div className="notice" style={{ marginTop: "1rem" }}>
                  <p style={{ marginBottom: ".35rem" }}><strong>Chi tiết thanh toán</strong></p>
                  <p>Tạm tính: {formatPrice(quote.subtotal)}đ</p>
                  <p>Giảm giá: {formatPrice(quote.discountAmount)}đ</p>
                  <p>Điểm: {formatPrice(quote.pointsDiscount)}đ</p>
                  <p style={{ marginBottom: 0 }}>Phải trả: {formatPrice(quote.finalTotal)}đ</p>
                </div>
              )}
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
