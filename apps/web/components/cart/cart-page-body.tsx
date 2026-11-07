"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatPrice } from "../../lib/format-price";
import { MAX_LINE_QUANTITY, lineTotal } from "../../lib/cart-config";
import { resolveProductImage } from "../../lib/safe-image";
import { calculateQuote, type PriceQuote } from "../../services/quote.service";
import { useCart } from "./cart-provider";

export function CartPageBody() {
  const { lines, subtotal, count, setQuantity, remove } = useCart();
  const [coupon, setCoupon] = useState("");
  const [quote, setQuote] = useState<PriceQuote | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  useEffect(() => {
    setQuote(null);
  }, [lines]);
  const discount = quote ? quote.discountAmount + quote.pointsDiscount : 0;
  const total = quote?.finalTotal ?? subtotal;

  async function applyCoupon() {
    if (lines.length === 0) return;
    setPending(true);
    setMessage("");
    try {
      setQuote(await calculateQuote(lines, coupon));
    } catch (error) {
      setQuote(null);
      setMessage(error instanceof Error ? error.message : "Máy chủ không tính được giá. Vui lòng thử lại.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="cart-board">
      <div className="container cart-layout">
        <div>
          <h1>Giỏ hàng ({count} món)</h1>
          {lines.length === 0 ? (
            <div className="cart-empty">
              <p>Giỏ của bạn đang trống.</p>
              <Link href="/menu">Chọn món</Link>
            </div>
          ) : (
            <div className="cart-products-scroll" role="region" aria-label="Danh sách món trong giỏ" tabIndex={0}>
            <div className="cart-column-head" aria-hidden="true">
              <span>Ảnh</span><span>Tên món</span><span>Size</span><span>Topping</span><span>Ghi chú</span><span>Thành tiền</span><span>Số lượng</span><span>Thao tác</span>
            </div>
            <ul className="cart-sheet">
              {lines.map((line) => {
                const image = resolveProductImage(line.imageUrl);
                const toppingText = line.toppings.length > 0
                  ? `Thêm ${line.toppings.map((topping) => topping.name).join(", ")}`
                  : "Không topping";
                const sizeLabel = /^size\b/i.test(line.sizeName) ? line.sizeName : `Size ${line.sizeName}`;
                return (
                  <li className="cart-sheet-line" key={line.key}>
                    {image ? (
                      <img src={image} alt="" width={84} height={84} />
                    ) : (
                      <span className="cart-thumb" aria-hidden="true">☕</span>
                    )}
                    <div className="cart-sheet-main">
                      <div className="cart-sheet-name">{line.name}</div>
                      <div className="cart-row-actions">
                        <Link className="cart-edit" href={`/products/${line.productId}?edit=${encodeURIComponent(line.key)}`}>Sửa</Link>
                        <button type="button" className="cart-delete" aria-label={`Xóa ${line.name}`} onClick={() => remove(line.key)}>Xóa</button>
                      </div>
                      <div className="cart-size-cell">{sizeLabel}</div>
                      <div className="cart-topping-cell">{toppingText}</div>
                      <div className="cart-note-cell">{line.note || "—"}</div>
                      <div className="cart-sheet-tools">
                        <div className="bag-qty">
                          <button type="button" aria-label={`Giảm số lượng ${line.name}`} onClick={() => setQuantity(line.key, line.quantity - 1)}>−</button>
                          <input
                            aria-label={`Số lượng ${line.name}`}
                            inputMode="numeric"
                            value={line.quantity}
                            onChange={(event) => {
                              const next = Number(event.target.value);
                              if (Number.isInteger(next)) setQuantity(line.key, next);
                            }}
                          />
                          <button type="button" aria-label={`Tăng số lượng ${line.name}`} disabled={line.quantity >= MAX_LINE_QUANTITY} onClick={() => setQuantity(line.key, line.quantity + 1)}>+</button>
                        </div>

                      </div>
                    </div>
                    <div className="cart-sheet-price">
                      <strong>{formatPrice(lineTotal(line.unitPrice, line.quantity))}đ</strong>

                    </div>
                  </li>
                );
              })}
            </ul>
            </div>
          )}
        </div>

        <aside className="cart-summary" aria-label="Tóm tắt đơn">
          <h2>Tóm tắt đơn</h2>
          <form className="cart-coupon" onSubmit={(event) => { event.preventDefault(); void applyCoupon(); }}>
            <label className="visually-hidden" htmlFor="cart-coupon">Mã giảm giá</label>
            <input id="cart-coupon" value={coupon} onChange={(event) => setCoupon(event.target.value)} placeholder="Mã giảm giá" />
            <button type="submit" disabled={pending || lines.length === 0}>{pending ? "Đang áp dụng" : "Áp dụng"}</button>
          </form>
          {message ? <p className="cart-summary-note" role="alert">{message}</p> : null}
          <label className="cart-points">
            <span>
              <strong>Dùng điểm tích lũy</strong>
              <small>Đăng nhập để dùng điểm</small>
            </span>
            <input type="checkbox" disabled />
          </label>
          <dl>
            <div><dt>Tạm tính</dt><dd>{formatPrice(quote?.subtotal ?? subtotal)}đ</dd></div>
            <div><dt>Giảm giá</dt><dd>{formatPrice(discount)}đ</dd></div>
            <div className="cart-summary-total"><dt>Tổng cộng</dt><dd>{formatPrice(total)}đ</dd></div>
          </dl>
          {lines.length > 0 ? (
            <Link className="cart-order" href="/checkout">Đặt món nhận tại quầy</Link>
          ) : (
            <button type="button" className="cart-order" disabled>Đặt món nhận tại quầy</button>
          )}
          <Link className="cart-more" href="/menu">Mua thêm món</Link>
        </aside>
      </div>
    </section>
  );
}
