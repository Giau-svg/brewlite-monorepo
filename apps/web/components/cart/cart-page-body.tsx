"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useState } from "react";
import { PurchaseFlow } from "../checkout/purchase-flow";
import { formatPrice } from "../../lib/format-price";
import { MAX_LINE_QUANTITY, lineTotal } from "../../lib/cart-config";
import { resolveProductImage } from "../../lib/safe-image";
import { useCart } from "./cart-provider";

export function CartPageBody() {
  const { lines, subtotal, count, setQuantity, remove, ready, busy, canCheckout, pendingGuest = [], retry } = useCart();
  const [loginOpen, setLoginOpen] = useState(false);
  return (
    <section className="cart-board">
      <div className="container cart-layout">
        <div>
          <h1>Giỏ hàng ({count} món)</h1>
          {pendingGuest.length > 0 && <div className="notice notice-warn" role="region" aria-label="Giỏ tạm chưa đồng bộ"><h2>Giỏ tạm chưa đồng bộ</h2><p>Các món này vẫn được giữ trên trình duyệt và chưa được tính vào giỏ PostgreSQL.</p><ul>{pendingGuest.map((line) => <li key={line.key}>{line.name} · {line.quantity} ly · {line.sizeName} <Link href={`/products/${line.productId}?edit=${encodeURIComponent(`guest:${line.key}`)}`}>Chỉnh cấu hình</Link> <button type="button" onClick={() => remove(`guest:${line.key}`)}>Bỏ món tạm</button></li>)}</ul><button type="button" onClick={retry} disabled={busy}>Thử đồng bộ lại</button></div>}
          {ready === false ? <p role="status">Đang đồng bộ giỏ hàng…</p> : lines.length === 0 ? (
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
                      {line.requiresConfiguration && <p role="status">Cần cấu hình lại Size/Topping.</p>}
                      {line.issues?.map((issue) => <p key={issue.code} className="cart-line-issue">{issue.message}</p>)}
                      <div className="cart-row-actions">
                        <Link className="cart-edit" href={`/products/${line.productId}?edit=${encodeURIComponent(line.key)}`}>Sửa</Link>
                        <button type="button" className="cart-delete" aria-label={`Xóa ${line.name}`} onClick={() => remove(line.key)}>Xóa</button>
                      </div>
                      <div className="cart-size-cell">{sizeLabel}</div>
                      <div className="cart-topping-cell">{toppingText}</div>
                      <div className="cart-note-cell">{line.note || "—"}</div>
                      <div className="cart-sheet-tools">
                        <div className="bag-qty">
                          <button type="button" disabled={busy || line.requiresConfiguration} aria-label={`Giảm số lượng ${line.name}`} onClick={() => setQuantity(line.key, line.quantity - 1)}>−</button>
                          <input
                            aria-label={`Số lượng ${line.name}`}
                            inputMode="numeric"
                            disabled={busy || line.requiresConfiguration}
                            value={line.quantity}
                            onChange={(event) => {
                              const next = Number(event.target.value);
                              if (Number.isInteger(next)) setQuantity(line.key, next);
                            }}
                          />
                          <button type="button" aria-label={`Tăng số lượng ${line.name}`} disabled={busy || line.requiresConfiguration || line.quantity >= MAX_LINE_QUANTITY} onClick={() => setQuantity(line.key, line.quantity + 1)}>+</button>
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
          <dl>
            <div className="cart-summary-total"><dt>Tạm tính</dt><dd>{formatPrice(subtotal)}đ</dd></div>
          </dl>
          {lines.length > 0 ? (
            <button type="button" disabled={canCheckout === false} className="cart-order" onClick={() => setLoginOpen(true)}>Xác nhận mua</button>
          ) : (
            <button type="button" className="cart-order" disabled>Xác nhận mua</button>
          )}
          <Link className="cart-more" href="/menu">Mua thêm món</Link>
        </aside>
      </div>
      {loginOpen && <PurchaseFlow onClose={() => setLoginOpen(false)} />}
    </section>
  );
}
